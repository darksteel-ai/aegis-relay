import { describe, expect, test } from "vitest";

import {
  UploadReservationError,
  consumeIssuedUploadReservation,
} from "@/lib/uploads/reservations";

type Reservation = {
  storageKey: string;
  workspaceId: string;
  userId: string;
  status: "ISSUED" | "CONSUMED";
  consumedAt: Date | null;
  expiresAt: Date;
};

function createFakeTx(reservations: Reservation[]) {
  return {
    uploadReservation: {
      async updateMany(args: {
        where: {
          storageKey: string;
          workspaceId: string;
          userId: string;
          status: "ISSUED";
          consumedAt: null;
          expiresAt: { gt: Date };
        };
        data: { status: "CONSUMED"; consumedAt: Date };
      }) {
        let count = 0;

        for (const reservation of reservations) {
          if (
            reservation.storageKey === args.where.storageKey &&
            reservation.workspaceId === args.where.workspaceId &&
            reservation.userId === args.where.userId &&
            reservation.status === args.where.status &&
            reservation.consumedAt === args.where.consumedAt &&
            reservation.expiresAt > args.where.expiresAt.gt
          ) {
            reservation.status = args.data.status;
            reservation.consumedAt = args.data.consumedAt;
            count += 1;
          }
        }

        return { count };
      },
    },
  };
}

describe("upload reservation consumption", () => {
  test("consumes a matching issued upload once", async () => {
    const now = new Date("2026-05-12T12:00:00.000Z");
    const reservations: Reservation[] = [
      {
        storageKey: "uploads/workspaces/workspace_123/users/user_123/clip.mp4",
        workspaceId: "workspace_123",
        userId: "user_123",
        status: "ISSUED",
        consumedAt: null,
        expiresAt: new Date("2026-05-12T12:10:00.000Z"),
      },
    ];

    await expect(
      consumeIssuedUploadReservation(createFakeTx(reservations), {
        storageKey: reservations[0].storageKey,
        workspaceId: "workspace_123",
        userId: "user_123",
        now,
      }),
    ).resolves.toBeUndefined();

    expect(reservations[0]).toMatchObject({
      status: "CONSUMED",
      consumedAt: now,
    });
  });

  test("rejects missing or forged upload reservations", async () => {
    await expect(
      consumeIssuedUploadReservation(createFakeTx([]), {
        storageKey: "uploads/workspaces/workspace_123/users/user_123/forged.mp4",
        workspaceId: "workspace_123",
        userId: "user_123",
        now: new Date("2026-05-12T12:00:00.000Z"),
      }),
    ).rejects.toBeInstanceOf(UploadReservationError);
  });

  test("rejects another user reservation in the same workspace", async () => {
    const storageKey = "uploads/workspaces/workspace_123/users/other_user/clip.mp4";

    await expect(
      consumeIssuedUploadReservation(
        createFakeTx([
          {
            storageKey,
            workspaceId: "workspace_123",
            userId: "other_user",
            status: "ISSUED",
            consumedAt: null,
            expiresAt: new Date("2026-05-12T12:10:00.000Z"),
          },
        ]),
        {
          storageKey,
          workspaceId: "workspace_123",
          userId: "user_123",
          now: new Date("2026-05-12T12:00:00.000Z"),
        },
      ),
    ).rejects.toBeInstanceOf(UploadReservationError);
  });

  test("prevents single-use reservations from being consumed twice", async () => {
    const now = new Date("2026-05-12T12:00:00.000Z");
    const storageKey = "uploads/workspaces/workspace_123/users/user_123/clip.mp4";
    const tx = createFakeTx([
      {
        storageKey,
        workspaceId: "workspace_123",
        userId: "user_123",
        status: "ISSUED",
        consumedAt: null,
        expiresAt: new Date("2026-05-12T12:10:00.000Z"),
      },
    ]);

    await consumeIssuedUploadReservation(tx, {
      storageKey,
      workspaceId: "workspace_123",
      userId: "user_123",
      now,
    });

    await expect(
      consumeIssuedUploadReservation(tx, {
        storageKey,
        workspaceId: "workspace_123",
        userId: "user_123",
        now,
      }),
    ).rejects.toBeInstanceOf(UploadReservationError);
  });
});
