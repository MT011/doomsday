export type SessionSchedule = {
  time: string;
  language: string;
  format: "2D" | "3D" | "IMAX";
};

const SESSION_SCHEDULES: SessionSchedule[][] = [
  [
    { time: "13:20", language: "Dublado", format: "2D" },
    { time: "15:30", language: "Legendado", format: "3D" },
    { time: "18:10", language: "Legendado", format: "2D" },
    { time: "21:25", language: "Dublado", format: "2D" },
  ],
  [
    { time: "13:40", language: "Dublado", format: "2D" },
    { time: "15:50", language: "Legendado", format: "3D" },
    { time: "18:30", language: "Legendado", format: "2D" },
    { time: "21:45", language: "Dublado", format: "2D" },
  ],
  [
    { time: "12:55", language: "Dublado", format: "2D" },
    { time: "15:20", language: "Legendado", format: "3D" },
    { time: "18:00", language: "Legendado", format: "2D" },
    { time: "21:10", language: "Dublado", format: "2D" },
  ],
  [
    { time: "13:20", language: "Dublado", format: "2D" },
    { time: "16:05", language: "Legendado", format: "3D" },
    { time: "18:45", language: "Legendado", format: "2D" },
    { time: "22:00", language: "Dublado", format: "2D" },
  ],
  [
    { time: "14:00", language: "Dublado", format: "2D" },
    { time: "16:20", language: "Legendado", format: "3D" },
    { time: "19:05", language: "Legendado", format: "2D" },
    { time: "21:35", language: "Dublado", format: "2D" },
  ],
  [
    { time: "13:10", language: "Dublado", format: "2D" },
    { time: "15:40", language: "Legendado", format: "3D" },
    { time: "18:20", language: "Legendado", format: "2D" },
    { time: "21:50", language: "Dublado", format: "2D" },
  ],
];

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function getSessionSchedule(date: string, releaseDate: string) {
  const selectedDate = new Date(`${date}T00:00:00Z`).getTime();
  const firstDate = new Date(`${releaseDate}T00:00:00Z`).getTime();
  const offset = Number.isFinite(selectedDate) && Number.isFinite(firstDate)
    ? Math.round((selectedDate - firstDate) / DAY_IN_MILLISECONDS)
    : 0;
  const scheduleIndex = Math.min(Math.max(offset, 0), SESSION_SCHEDULES.length - 1);
  return SESSION_SCHEDULES[scheduleIndex].map((session) => ({ ...session }));
}
