import { createServerFn } from "@tanstack/react-start";
import { readAllSections, writeSection, writeAllSections } from "./storage.server";

export const readAllDataFn = createServerFn({ method: "GET" })
  .handler(async () => readAllSections());

export const writeSectionFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { section: string; items: unknown })
  .handler(async ({ data }) => {
    writeSection(data.section, data.items);
    return { ok: true };
  });

export const writeAllDataFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as Record<string, unknown>)
  .handler(async ({ data }) => {
    writeAllSections(data);
    return { ok: true };
  });
