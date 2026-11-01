import { Adapter, AtsName } from "../types.ts";
import { ashbyAdapter } from "./ashby.ts";
import { greenhouseAdapter } from "./greenhouse.ts";
import { leverAdapter } from "./lever.ts";

const registry: Record<AtsName, Adapter> = {
  greenhouse: greenhouseAdapter,
  lever: leverAdapter,
  ashby: ashbyAdapter,
};

export function getAdapter(ats: string): Adapter | undefined {
  return registry[ats as AtsName];
}
