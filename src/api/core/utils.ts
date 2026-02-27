import type { SseEvent } from "./types";

export function parseSseChunk<T>(chunk: string): SseEvent<T> | null {
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

    let parsedData: T;
    try {
        parsedData = JSON.parse(rawData) as T;
    } catch {
        parsedData = rawData as T;
    }

    return {
        event: eventName,
        data: parsedData,
    }
}