import { describe, expect, it } from "vitest";
import { getSessionSchedule } from "../client/src/lib/session-schedule";

describe("horários da pré-venda", () => {
  const releaseDate = "2026-12-18";

  it("mantém cinco horários e varia a programação entre os dias", () => {
    const day18 = getSessionSchedule("2026-12-18", releaseDate);
    const day19 = getSessionSchedule("2026-12-19", releaseDate);
    const day23 = getSessionSchedule("2026-12-23", releaseDate);

    expect(day18).toHaveLength(5);
    expect(day19).toHaveLength(5);
    expect(day23).toHaveLength(5);
    expect(day18.map(({ time }) => time)).not.toEqual(day19.map(({ time }) => time));
    expect(day19.map(({ time }) => time)).not.toEqual(day23.map(({ time }) => time));
  });

  it("inclui 11:30 em todos os dias e preserva os quatro horários anteriores", () => {
    const originalTimes = [
      ["13:20", "15:30", "18:10", "21:25"],
      ["13:40", "15:50", "18:30", "21:45"],
      ["12:55", "15:20", "18:00", "21:10"],
      ["13:20", "16:05", "18:45", "22:00"],
      ["14:00", "16:20", "19:05", "21:35"],
      ["13:10", "15:40", "18:20", "21:50"],
    ];
    originalTimes.forEach((times, index) => {
      const schedule = getSessionSchedule(`2026-12-${18 + index}`, releaseDate);
      expect(schedule).toHaveLength(5);
      expect(schedule[0]).toEqual({ time: "11:30", language: "Dublado", format: "2D" });
      expect(schedule[0].time < "12:55").toBe(true);
      expect(schedule.slice(1).map(({ time }) => time)).toEqual(times);
      expect(schedule.every(({ language }) => language === "Dublado")).toBe(true);
      expect(new Set(schedule.map(({ time }) => time)).size).toBe(5);
    });
  });

  it("é determinística e preserva horários, idiomas e formatos válidos", () => {
    const first = getSessionSchedule("2026-12-21", releaseDate);
    const second = getSessionSchedule("2026-12-21", releaseDate);

    expect(first).toEqual(second);
    expect(first.every(({ time }) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))).toBe(true);
    expect(first.every(({ language, format }) => language === "Dublado" && ["2D", "3D", "IMAX"].includes(format))).toBe(true);
    first[0].language = "Teste";
    expect(getSessionSchedule("2026-12-21", releaseDate)[0].language).toBe("Dublado");
  });

  it("usa uma grade segura para datas fora da janela", () => {
    expect(getSessionSchedule("2026-12-17", releaseDate)).toEqual(getSessionSchedule("2026-12-18", releaseDate));
    expect(getSessionSchedule("2026-12-30", releaseDate)).toEqual(getSessionSchedule("2026-12-23", releaseDate));
  });
});
