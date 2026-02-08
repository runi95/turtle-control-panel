export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_ASSET_GENERATION != null) {
    console.log(
      "SKIP_ASSET_GENERATION has been set, skipping asset generation...",
    );
    return;
  }

  const assetLoader = await import("./loadAssets");
  await assetLoader.load();
}
