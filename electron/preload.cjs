// Timay Platform — preload (güvenli köprü). Şimdilik yalnız sürüm bilgisi expose edilir.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("timayDesktop", {
  isDesktop: true,
  platform: process.platform,
  versions: { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node },
});
