import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/billing(.*)",
  "/calendar(.*)",
  "/composer(.*)",
  "/connections(.*)",
  "/dashboard(.*)",
  "/posts(.*)",
  "/api/oauth(.*)",
  "/api/posts(.*)",
  "/api/stripe(.*)",
  "/api/uploads(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
