import { DEFAULT_CONFIG, type GastownConfig } from '../types.ts';

const CONFIG_FILE = 'gastown.json';

export async function loadConfig(projectDir: string): Promise<GastownConfig> {
  const configPath = `${projectDir}/${CONFIG_FILE}`;
  try {
    const content = await Deno.readTextFile(configPath);
    const userConfig = JSON.parse(content) as Partial<GastownConfig>;
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(projectDir: string, config: GastownConfig): Promise<void> {
  const configPath = `${projectDir}/${CONFIG_FILE}`;
  await Deno.writeTextFile(configPath, JSON.stringify(config, null, 2));
}

export function generateDefaultConfig(): GastownConfig {
  return { ...DEFAULT_CONFIG };
}
