import { describe, expect, it } from "vitest";
import { getSessionSchedule } from "../client/src/lib/session-schedule";

describe("horários da pré-venda", () => {
  const releaseDate = "2026-12-18";

  it("mantém quatro horários e varia a programação entre os dias", () => {
    const day18 = getSessionSchedule("2026-12-18", releaseDate);
    const day19 = getSessionSchedule("2026-12-19", releaseDate);
    const day23 = getSessionSchedule("2026-12-23", releaseDate);

    expect(day18).toHaveLength(4);
    expect(day19).toHaveLength(4);
    expect(day23).toHaveLength(4);
    expect(day18.map(({ time }) => time)).not.toEqual(day19.map(({ time }) => time));
    expect(day19.map(({ time }) => time)).not.toEqual(day23.map(({ time }) => time));
  });

  it("é determinística e preserva horários, idiomas e formatos válidos", () => {
    const first = getSessionSchedule("2026-12-21", releaseDate);
    const second = getSessionSchedule("2026-12-21", releaseDate);

    expect(first).toEqual(second);
    expect(first.every(({ time, language, format }) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))).toBe(true);
    expect(first.every(({ language, format }) => ["Dublado", "Legendado"].includes(language) && ["2D", "3D", "IMAX"].includes(format))).toBe(true);
  });

  it("usa uma grade segura para datas fora da janela", () => {
    expect(getSessionSchedule("2026-12-17", releaseDate)).toEqual(getSessionSchedule("2026-12-18", releaseDate));
    expect(getSessionSchedule("2026-12-30", releaseDate)).toEqual(getSessionSchedule("2026-12-23", releaseDate));
  });
});
