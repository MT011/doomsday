export const filmConfig = {
  title: "Avengers: Doomsday",
  displayTitle: "AVENGERS: DOOMSDAY",
  releaseDate: "2026-12-18",
  releaseDateLabel: "18 DEZ 2026",
  releaseDateLong: "18 de dezembro de 2026",
  heroEyebrow: "Uma experiência Marvel Studios",
  heroLede:
    "Três universos. Uma colisão inevitável. Escolha seu cinema e garanta seu lugar no dia que o impossível chega às telas.",
  aboutKicker: "O evento",
  aboutHeadline: "O fim de uma era. O começo do impossível.",
  synopsis:
    "Avengers: Doomsday reúne heróis de três universos distintos em uma colisão mortal. Diante de uma ameaça existencial como nenhuma outra, cada escolha pode ser a última.",
  formats: ["2D", "3D", "IMAX"] as const,
  officialSource: "https://www.marvel.com/movies/avengers-doomsday",
  demoModeNotice:
    "Este ambiente é um protótipo. Para abrir vendas, será necessário conectar o gateway de pagamento, a reserva transacional e a emissão oficial de ingressos.",
} as const;

export type FilmConfig = typeof filmConfig;
