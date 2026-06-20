const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("launcher", {
  getConfig: () => ipcRenderer.invoke("get-config"),
  openWebsite: () => ipcRenderer.invoke("open-website"),
  login: (creds) => ipcRenderer.invoke("login", creds),
  logout: () => ipcRenderer.invoke("logout"),
  pingServer: () => ipcRenderer.invoke("ping-server"),
  getSkinImage: () => ipcRenderer.invoke("get-skin-image"),
  setRam: (mb) => ipcRenderer.invoke("set-ram", mb),
  openFolder: () => ipcRenderer.invoke("open-folder"),
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  play: () => ipcRenderer.invoke("play"),
  onStatus: (cb) => ipcRenderer.on("status", (_e, msg) => cb(msg)),
  onUpdate: (cb) => ipcRenderer.on("update", (_e, msg) => cb(msg)),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  downloadUpdate: () => ipcRenderer.invoke("download-update")
});
