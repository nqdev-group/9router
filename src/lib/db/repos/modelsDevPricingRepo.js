import { makeKv } from "../helpers/kvStore.js";
import {
  MODELS_DEV_SCOPE,
  MODELS_DEV_SNAPSHOT_KEY,
  MODELS_DEV_MAP_KEY,
} from "@/shared/constants/modelsDevDefaults.js";

const mdKv = makeKv(MODELS_DEV_SCOPE);

export async function getSnapshot() {
  return await mdKv.get(MODELS_DEV_SNAPSHOT_KEY);
}

export async function saveSnapshot(data) {
  await mdKv.set(MODELS_DEV_SNAPSHOT_KEY, data);
}

export async function clearSnapshot() {
  await mdKv.remove(MODELS_DEV_SNAPSHOT_KEY);
}

export async function getModelMap() {
  return await mdKv.get(MODELS_DEV_MAP_KEY, {});
}

export async function saveModelMap(map) {
  await mdKv.set(MODELS_DEV_MAP_KEY, map);
}

export async function clearAll() {
  await mdKv.clear();
}
