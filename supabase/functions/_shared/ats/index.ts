import { Adapter, AtsName } from "../types.ts";
import { ashbyAdapter } from "./ashby.ts";
import { greenhouseAdapter } from "./greenhouse.ts";
import { leverAdapter } from "./lever.ts";
import { remotiveAdapter } from "./remotive.ts";
import { arbeitnowAdapter } from "./arbeitnow.ts";
import { customHtmlAdapter } from "./custom_html.ts";

const registry: Record<AtsName, Adapter> = {
  greenhouse: greenhouseAdapter,
  lever: leverAdapter,
  ashby: ashbyAdapter,
  remotive: remotiveAdapter,
  arbeitnow: arbeitnowAdapter,
  custom_html: customHtmlAdapter,
};

export function getAdapter(ats: string): Adapter | undefined {
  return registry[ats as AtsName];
}
