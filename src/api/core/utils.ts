import type { SseEvent } from "./types";

export function parseSseChunk<TEvent extends SseEvent<unknown>>(
    chunk: string,
): TEvent | null {
    const lines = chunk.split("\n");
    let eventName = "message";
    const dataLines: string[] = [];

    for (const rowLine of lines) {
        const line = rowLine.replace(/\r$/, "");
        if (!line || line.startsWith(":")) continue;
        if (line.startsWith("event:")) {
            eventName = line.slice(6).trim();
            continue;
        }

        if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
        }
    }

    if (dataLines.length === 0) return null;

    const rawData = dataLines.join("\n");

    let parsedData: TEvent["data"];
    try {
        parsedData = JSON.parse(rawData) as TEvent["data"];
    } catch {
        parsedData = rawData as TEvent["data"];
    }

    return {
        type: eventName,
        data: parsedData,
    } as TEvent;
}