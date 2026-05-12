export class UploadReservationError extends Error {
  constructor(message = "Upload was not issued to this user or has already been used.") {
    super(message);
    this.name = "UploadReservationError";
  }
}

type UploadReservationTx = {
  uploadReservation: {
    updateMany(args: {
      where: {
        storageKey: string;
        workspaceId: string;
        userId: string;
        status: "ISSUED";
        consumedAt: null;
        expiresAt: { gt: Date };
      };
      data: {
        status: "CONSUMED";
        consumedAt: Date;
      };
    }): Promise<{ count: number }>;
  };
};

export async function consumeIssuedUploadReservation(
  tx: UploadReservationTx,
  {
    storageKey,
    workspaceId,
    userId,
    now = new Date(),
  }: {
    storageKey: string;
    workspaceId: string;
    userId: string;
    now?: Date;
  },
) {
  const result = await tx.uploadReservation.updateMany({
    where: {
      storageKey,
      workspaceId,
      userId,
      status: "ISSUED",
      consumedAt: null,
      expiresAt: { gt: now },
    },
    data: {
      status: "CONSUMED",
      consumedAt: now,
    },
  });

  if (result.count !== 1) {
    throw new UploadReservationError();
  }
}
