const { contextBridge, ipcRenderer } = require("electron");

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld("administrationDesktop", {
  capabilities: () => invoke("desktop:capabilities"),
  steamUser: () => invoke("desktop:steamUser"),
  setRichPresence: (key, value) => invoke("desktop:setRichPresence", key, value),
  clearRichPresence: () => invoke("desktop:clearRichPresence"),
  unlockAchievement: (id) => invoke("desktop:unlockAchievement", id),
  savesDirectory: () => invoke("desktop:savesDirectory"),
  getItem: (key) => invoke("desktop:getItem", key),
  setItem: (key, value) => invoke("desktop:setItem", key, value),
  removeItem: (key) => invoke("desktop:removeItem", key),
});
