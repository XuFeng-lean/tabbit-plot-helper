export class PresetManager {
  constructor() {
    this.settings = {
      autoExtract: true,
      showImpact: true,
      cacheOptions: true
    };
    this.loadSettings();
  }

  loadSettings() {
    if (chat_metadata.tabbit_settings) {
      Object.assign(this.settings, chat_metadata.tabbit_settings);
    }
  }

  saveSettings() {
    chat_metadata.tabbit_settings = this.settings;
    saveMetadata();
  }

  getSettings() {
    return this.settings;
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
  }
}
