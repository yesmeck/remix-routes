/**
 * @type {import('@remix-run/dev/config').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  browserBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildDirectory: "build",
  devServerPort: 8002,
  routes(defineRoutes) {
    return defineRoutes((route) => {
      route("/somewhere/cool/*", "catchall.tsx");
    });
  },
};
