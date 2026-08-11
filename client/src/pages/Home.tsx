import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Film,
  Globe2,
  Grid3X3,
  Hand,
  Info,
  Landmark,
  Mail,
  MapPin,
  Minus,
  MonitorPlay,
  MousePointer2,
  Move,
  Plus,
  QrCode,
  ScanLine,
  ShoppingBag,
  Sparkles,
  Ticket,
  Trash2,
  UserRound,
  WalletCards,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { cinemaCatalog } from "@/data/cinemas";
import { trpc } from "@/lib/trpc";
import { filmConfig } from "@shared/film-config";

type Screen = "discover" | "sessions" | "seats" | "checkout" | "confirmation";
type TicketType = "inteira" | "meia";
type SeatStatus = "available" | "occupied";

type Cinema = {
  name: string;
  city: string;
  state: string;
  uf: string;
};

type Session = {
  id: string;
  date: string;
  dateLabel: string;
  time: string;
  language: string;
  format: "2D" | "3D" | "IMAX";
  room: string;
  price: number;
};

type Seat = {
  id: string;
  row: string;
  number: number;
  status: SeatStatus;
  isAccessible?: boolean;
  isCompanion?: boolean;
  aisleBefore?: boolean;
};

type SeatSelection = Seat & { ticketType: TicketType };
type OrderSeat = Pick<SeatSelection, "id" | "row" | "number" | "ticketType">;

type Order = {
  code: string;
  createdAt: string;
  buyer: { name: string; email: string; document: string };
  session: Session;
  cinema: Cinema;
  seats: OrderSeat[];
  total: number;
  payment: string;
};

const HERO_URL = "/manus-storage/avengers-doomsday-hero_13158c4a.webp";
const LOGO_URL = "/manus-storage/avengers-doomsday-logo_28159119.webp";
const WHOLE_PRICE = 39.9;
const HALF_PRICE = 19.95;

const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const slug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function hashString(value: string) {
  return value.split("").reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 997, 0);
}

function getRequestedScreen(): Screen {
  if (typeof window === "undefined") return "discover";
  const requested = new URLSearchParams(window.location.search).get("screen");
  return requested === "sessions" || requested === "seats" || requested === "checkout" || requested === "confirmation" ? requested : "discover";
}

function getInitialLocation() {
  if (typeof window === "undefined") return { uf: "SP", city: "São Paulo" };
  const params = new URLSearchParams(window.location.search);
  if (params.get("recovered") === "1") return { uf: "AC", city: "Rio Branco" };
  return { uf: "SP", city: "São Paulo" };
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).replace(".", "").toUpperCase();
}

function buildSessions(cinema: Cinema): Session[] {
  const seed = hashString(cinema.name);
  const releaseDate = new Date(`${filmConfig.releaseDate}T00:00:00Z`);
  releaseDate.setUTCDate(releaseDate.getUTCDate() + (seed % 3));
  const day = String(releaseDate.getUTCDate()).padStart(2, "0");
  const date = releaseDate.toISOString().slice(0, 10);
  const times = ["13:20", "15:00", "18:10", "21:25"];
  return times.map((time, index) => ({
    id: `${slug(cinema.name)}-${date}-${time.replace(":", "")}`,
    date,
    dateLabel: formatDateLabel(releaseDate),
    time,
    language: index % 3 === 0 ? "Dublado" : "Legendado",
    format: index === 1 ? "IMAX" : index === 2 ? "3D" : "2D",
    room: `Sala ${(seed + index) % 5 + 1}`,
    price: index === 1 ? 44.9 : index === 2 ? 42.9 : 39.9,
  }));
}

function buildSeats(cinemaName: string, sessionId: string): Seat[] {
  const seed = hashString(`${cinemaName}-${sessionId}`);
  const rows = cinemaName.toLowerCase().includes("imax") ? 12 : 10 + (seed % 2);
  const columns = cinemaName.toLowerCase().includes("vip") ? 12 : 16;
  const occupiedCount = 5 + (seed % 9);
  const occupied = new Set<number>();
  for (let index = 0; index < occupiedCount; index += 1) {
    occupied.add((seed * (index + 3) + index * 17) % (rows * columns));
  }

  const seats: Seat[] = [];
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row = String.fromCharCode(65 + rowIndex);
    for (let number = 1; number <= columns; number += 1) {
      const seatIndex = rowIndex * columns + number - 1;
      seats.push({
        id: `${row}-${number}`,
        row,
        number,
        status: occupied.has(seatIndex) ? "occupied" : "available",
        isAccessible: rowIndex === rows - 1 && [2, columns - 1].includes(number),
        isCompanion: rowIndex === rows - 1 && [3, columns - 2].includes(number),
        aisleBefore: number === Math.floor(columns / 2) + 1,
      });
    }
  }
  return seats;
}

function StepIndicator({ current }: { current: Screen }) {
  const steps = [
    { id: "sessions", label: "Sessão" },
    { id: "seats", label: "Assentos" },
    { id: "checkout", label: "Pagamento" },
    { id: "confirmation", label: "Confirmação" },
  ];
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === current));
  return (
    <div className="step-indicator" aria-label="Progresso da compra">
      {steps.map((step, index) => (
        <div className={`step-item ${index <= currentIndex ? "is-active" : ""}`} key={step.id}>
          <span className="step-dot">{index < currentIndex ? <Check size={14} /> : index + 1}</span>
          <span>{step.label}</span>
          {index < steps.length - 1 ? <span className="step-line" /> : null}
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export default function Home() {
  const stateOptions = useMemo(() => {
    const unique = new Map<string, { name: string; uf: string }>();
    cinemaCatalog.forEach((cinema) => unique.set(cinema.uf, { name: cinema.state, uf: cinema.uf }));
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, []);
  const cityOptions = useMemo(() => {
    const unique = new Map<string, string>();
    cinemaCatalog.filter((cinema) => cinema.uf === "SP").forEach((cinema) => unique.set(cinema.city, cinema.city));
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, []);

  const [screen, setScreen] = useState<Screen>(() => getRequestedScreen());
  const [isDemoPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("screen"));
  const [isEmptyPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("empty") === "1");
  const [isEmailErrorPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("emailError") === "1");
  const [isNoCinemaPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("noCinemas") === "1");
  const [selectedState, setSelectedState] = useState(() => getInitialLocation().uf);
  const [selectedCity, setSelectedCity] = useState(() => getInitialLocation().city);
  const noCinemaScenario = isNoCinemaPreview && selectedState === "SP" && selectedCity === "São Paulo";
  const [selectedCinemaName, setSelectedCinemaName] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [seatSelections, setSeatSelections] = useState<SeatSelection[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const [buyer, setBuyer] = useState({ name: "", email: "", document: "" });
  const [payment, setPayment] = useState<"pix" | "card">("pix");
  const createDemoOrder = trpc.presale.createDemoOrder.useMutation();
  const sendDemoEmail = trpc.presale.sendDemoConfirmationEmail.useMutation();
  const [order, setOrder] = useState<Order | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const citiesForState = useMemo(() => {
    const unique = new Map<string, string>();
    cinemaCatalog.filter((cinema) => cinema.uf === selectedState).forEach((cinema) => unique.set(cinema.city, cinema.city));
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [selectedState]);

  const cinemasForCity = useMemo<Cinema[]>(() => {
    if (noCinemaScenario) return [];
    const unique = new Map<string, Cinema>();
    cinemaCatalog
      .filter((cinema) => cinema.uf === selectedState && cinema.city === selectedCity)
      .forEach((cinema) => unique.set(cinema.name, cinema));
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [noCinemaScenario, selectedState, selectedCity]);

  const selectedCinema = useMemo<Cinema>(() => {
    if (noCinemaScenario) {
      return {
        name: "Nenhum cinema disponível",
        city: selectedCity,
        state: stateOptions.find((state) => state.uf === selectedState)?.name ?? selectedState,
        uf: selectedState,
      };
    }
    return (
      cinemaCatalog.find((cinema) => cinema.uf === selectedState && cinema.city === selectedCity && cinema.name === selectedCinemaName) ??
      cinemasForCity[0] ??
      cinemaCatalog[0]
    );
  }, [cinemasForCity, noCinemaScenario, selectedCinemaName, selectedCity, selectedState, stateOptions]);

  const sessions = useMemo(() => buildSessions(selectedCinema), [selectedCinema]);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0];
  const seats = useMemo(() => buildSeats(selectedCinema.name, selectedSession.id), [selectedCinema.name, selectedSession.id]);
  const rows = useMemo(() => Array.from(new Set(seats.map((seat) => seat.row))), [seats]);
  const total = seatSelections.reduce((sum, seat) => sum + (seat.ticketType === "meia" ? HALF_PRICE : selectedSession.price), 0);

  useEffect(() => {
    if (!selectedCinemaName || !cinemasForCity.some((cinema) => cinema.name === selectedCinemaName)) {
      setSelectedCinemaName(cinemasForCity[0]?.name ?? "");
    }
  }, [cinemasForCity, selectedCinemaName]);

  useEffect(() => {
    if (!citiesForState.includes(selectedCity)) setSelectedCity(citiesForState[0] ?? "");
  }, [citiesForState, selectedCity]);

  useEffect(() => {
    setSelectedSessionId(sessions[0]?.id ?? "");
    setSeatSelections([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedCinema.name, sessions]);

  useEffect(() => {
    if (screen !== "seats") setIsDragging(false);
  }, [screen]);

  useEffect(() => {
    if (!isDemoPreview || isEmptyPreview || screen === "discover" || !seats.length || seatSelections.length) return;
    const demoSeats = seats.filter((seat) => seat.status === "available").slice(0, 2).map((seat) => ({ ...seat, ticketType: "inteira" as const }));
    setSeatSelections(demoSeats);
    if (screen === "confirmation" && !order) {
      setOrder({
        code: "DD-DEMO-PREVIEW",
        createdAt: new Date().toISOString(),
        buyer: { name: "Cliente de demonstração", email: "cliente@exemplo.com", document: "00000000000" },
        payment: "pix",
        session: selectedSession,
        cinema: selectedCinema,
        seats: demoSeats,
        total: demoSeats.length * selectedSession.price,
      });
    }
  }, [isDemoPreview, isEmptyPreview, screen, seats, seatSelections.length, order, selectedSession, selectedCinema]);

  const selectState = (uf: string) => {
    setSelectedState(uf);
    const nextCity = cinemaCatalog.find((cinema) => cinema.uf === uf)?.city ?? "";
    setSelectedCity(nextCity);
    setSelectedCinemaName("");
    setSelectedSessionId("");
    setSeatSelections([]);
  };

  const selectCity = (city: string) => {
    setSelectedCity(city);
    setSelectedCinemaName("");
    setSelectedSessionId("");
    setSeatSelections([]);
  };

  const startSessions = () => {
    setScreen("sessions");
    window.setTimeout(() => document.getElementById("purchase-flow")?.scrollIntoView({ behavior: "smooth" }), 20);
  };

  const startSeats = (session: Session) => {
    setSelectedSessionId(session.id);
    setSeatSelections([]);
    setScreen("seats");
    window.setTimeout(() => document.getElementById("purchase-flow")?.scrollIntoView({ behavior: "smooth" }), 20);
  };

  const toggleSeat = (seat: Seat) => {
    if (seat.status === "occupied") return;
    setSeatSelections((current) => {
      const existing = current.find((selected) => selected.id === seat.id);
      if (existing) return current.filter((selected) => selected.id !== seat.id);
      return [...current, { ...seat, ticketType: "inteira" }];
    });
  };

  const updateTicketType = (seatId: string, ticketType: TicketType) => {
    setSeatSelections((current) => current.map((seat) => (seat.id === seatId ? { ...seat, ticketType } : seat)));
  };

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!buyer.name || !buyer.email || !buyer.document || seatSelections.length === 0) {
      toast.error("Preencha seus dados e selecione ao menos um assento.");
      return;
    }
    createDemoOrder.mutate(
      {
        buyer,
        payment,
        cinema: selectedCinema,
        session: selectedSession,
        seats: seatSelections.map(({ id, row, number, ticketType }) => ({ id, row, number, ticketType })),
      },
      {
        onSuccess: (createdOrder) => {
          setOrder(createdOrder as Order);
          setScreen("confirmation");
          window.setTimeout(() => document.getElementById("purchase-flow")?.scrollIntoView({ behavior: "smooth" }), 20);
        },
        onError: (error) => toast.error(error.message || "Não foi possível criar o pedido."),
      },
    );
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragOrigin({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setPan({ x: event.clientX - dragOrigin.x, y: event.clientY - dragOrigin.y });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const resetFlow = () => {
    setScreen("discover");
    setOrder(null);
    setSeatSelections([]);
    setBuyer({ name: "", email: "", document: "" });
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 20);
  };

  return (
    <main className="presale-shell">
      <header className="site-header">
        <button className="brand-lockup" onClick={resetFlow} aria-label="Voltar para o início">
          <span className="brand-mark">A</span>
          <span>
            <strong>AVENGERS</strong>
            <small>DOOMSDAY / PRÉ-VENDA</small>
          </span>
        </button>
        <nav className="header-nav" aria-label="Navegação principal">
          <button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>O filme</button>
          <button onClick={() => document.getElementById("purchase-flow")?.scrollIntoView({ behavior: "smooth" })}>Comprar ingressos</button>
          <span className="header-status"><span className="pulse-dot" /> PRÉ-VENDA AO VIVO</span>
        </nav>
      </header>

      {screen === "discover" ? (
        <>
          <section className="hero-section" style={{ backgroundImage: `url(${HERO_URL})` }}>
            <div className="hero-overlay" />
            <div className="hero-content container">
              <div className="hero-copy">
                <span className="eyebrow"><Sparkles size={14} /> {filmConfig.heroEyebrow}</span>
                <img className="movie-logo" src={LOGO_URL} alt="Avengers Doomsday" />
                <p className="hero-lede">{filmConfig.heroLede}</p>
                <div className="hero-actions">
                  <button className="button button-primary" onClick={startSessions}><Ticket size={18} /> Comprar ingressos <ArrowRight size={17} /></button>
                  <button className="button button-ghost" onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>Conheça o filme <ChevronDown size={17} /></button>
                </div>
                <div className="hero-meta"><span><CalendarDays size={16} /> {filmConfig.releaseDateLabel}</span><span><MonitorPlay size={16} /> EXCLUSIVAMENTE NOS CINEMAS</span></div>
              </div>
            </div>
            <div className="hero-side-note">MARVEL STUDIOS <span>•</span> EVENTO GLOBAL</div>
          </section>

          <section id="about" className="about-section container">
            <div className="section-kicker"><span>01</span><span>O EVENTO</span></div>
            <div className="about-grid">
              <div>
                <h1>{filmConfig.aboutHeadline.split(" ").slice(0, 5).join(" ")}<br /><em>{filmConfig.aboutHeadline.split(" ").slice(5).join(" ")}</em></h1>
              </div>
              <div className="about-copy">
                <p>{filmConfig.synopsis}</p>
                <div className="info-ribbon"><div><span>ESTREIA</span><strong>{filmConfig.releaseDate.replaceAll("-", ".")}</strong></div><div><span>DIREÇÃO</span><strong>RUSSO BROTHERS</strong></div><div><span>FORMATO</span><strong>2D / 3D / IMAX</strong></div></div>
              </div>
            </div>
          </section>

          <section className="location-cta container">
            <div className="location-card">
              <div className="location-card-copy"><span className="eyebrow"><MapPin size={14} /> ESCOLHA O SEU DESTINO</span><h2>Onde você vai viver<br />o <em>dia do juízo?</em></h2><p>Selecione sua localização para encontrar sessões disponíveis e escolher seu assento.</p></div>
              <div className="location-preview"><span>PRÉ-VENDA NACIONAL</span><strong>441 cinemas</strong><small>em todo o Brasil</small><button className="button button-primary" onClick={startSessions}>Encontrar sessões <ArrowRight size={17} /></button></div>
            </div>
          </section>
        </>
      ) : null}

      {screen !== "discover" ? (
        <section id="purchase-flow" className="purchase-stage container">
          <div className="flow-heading"><div><span className="eyebrow"><Ticket size={14} /> FLUXO DE PRÉ-VENDA</span><h1>{screen === "confirmation" ? "Seu ingresso está garantido." : "Reserve seu lugar no evento."}</h1></div><StepIndicator current={screen} /></div>

          {screen === "sessions" ? (
            <div className="flow-grid">
              <div className="flow-main">
                <div className="panel panel-location">
                  <div className="panel-heading"><div><span className="panel-index">01</span><h2>Escolha sua localização</h2><p>A disponibilidade varia por cinema e região.</p></div><Globe2 size={22} /></div>
                  <div className="select-grid">
                    <label className="select-field"><span>Estado</span><select value={selectedState} onChange={(event) => selectState(event.target.value)}>{stateOptions.map((state) => <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>)}</select></label>
                    <label className="select-field"><span>Cidade</span><select value={selectedCity} onChange={(event) => selectCity(event.target.value)}>{citiesForState.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
                    <label className="select-field select-field-wide"><span>Cinema</span><select value={noCinemaScenario ? "" : selectedCinema.name} disabled={noCinemaScenario} onChange={(event) => setSelectedCinemaName(event.target.value)}>{noCinemaScenario ? <option value="">Nenhum cinema disponível</option> : cinemasForCity.map((cinema) => <option key={cinema.name} value={cinema.name}>{cinema.name}</option>)}</select></label>
                  </div>{noCinemaScenario ? <div className="demo-validation-hint location-empty-hint"><Info size={16} /> Nenhum cinema encontrado para esta combinação. Altere estado ou cidade para tentar novamente.</div> : null}
                </div>
                <div className="panel session-panel">
                  <div className="panel-heading"><div><span className="panel-index">02</span><h2>Escolha uma sessão</h2><p>{selectedCinema.name} · {selectedCity}, {selectedState}</p></div><CalendarDays size={22} /></div>
                  <div className="date-strip">{[0, 1, 2].map((offset) => { const date = new Date(`${filmConfig.releaseDate}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return <button className={`date-chip ${offset === 0 ? "is-active" : ""}`} key={offset}><strong>{formatDateLabel(date)}</strong><span>{date.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "").toUpperCase()}</span></button>; })}</div>
                  <div className="session-list">{isEmptyPreview || noCinemaScenario ? <div className="summary-empty session-empty"><Info size={20} /><span>{noCinemaScenario ? "Nenhuma sessão disponível porque não há cinema selecionado." : "Nenhuma sessão disponível para este cinema na data selecionada."}</span></div> : sessions.map((session) => <button key={session.id} className={`session-card ${selectedSession.id === session.id ? "is-highlighted" : ""}`} onClick={() => setSelectedSessionId(session.id)}><span className="session-time"><Clock3 size={16} /><strong>{session.time}</strong><small>{session.room}</small></span><span className="session-details"><strong>{session.language}</strong><span>{session.format} · Tela premium</span></span><span className="session-price">{currency(session.price)}<small>por inteira</small></span><span className="session-arrow"><ArrowRight size={18} /></span></button>)}</div>
                  <button className="button button-primary wide-button" disabled={isEmptyPreview || noCinemaScenario} onClick={() => startSeats(selectedSession)}>Escolher assentos <ArrowRight size={17} /></button>
                </div>
              </div>
              <aside className="flow-side"><OrderSummary cinema={selectedCinema} session={selectedSession} seats={seatSelections} total={total} onRemove={(id) => setSeatSelections((current) => current.filter((seat) => seat.id !== id))} onUpdateTicketType={updateTicketType} /></aside>
            </div>
          ) : null}

          {screen === "seats" ? (
            <div className="flow-grid seats-grid-layout">
              <div className="flow-main">
                <div className="panel seat-panel">
                  <div className="panel-heading"><div><span className="panel-index">03</span><h2>Escolha seus assentos</h2><p>{selectedCinema.name} · {selectedSession.room} · {selectedSession.dateLabel} às {selectedSession.time}</p></div><Grid3X3 size={22} /></div>
                  <div className="map-toolbar"><div className="map-help"><Move size={16} /> Arraste para navegar <span>•</span> use os controles para aproximar</div><div className="zoom-controls"><button onClick={() => setZoom((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))))} aria-label="Diminuir zoom"><Minus size={16} /></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(1.6, Number((value + 0.1).toFixed(2))))} aria-label="Aumentar zoom"><Plus size={16} /></button><button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Redefinir mapa">Reset</button></div></div>
                  <div className="seat-map-wrap" ref={mapRef}><div className="seat-map-canvas" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} style={{ cursor: isDragging ? "grabbing" : "grab" }}><div className="seat-map" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}><div className="screen-label">TELA</div><div className="seat-rows">{rows.map((row) => <div className="seat-row" key={row}><span className="row-label">{row}</span><div className="seat-row-items">{seats.filter((seat) => seat.row === row).map((seat) => { const selected = seatSelections.some((selection) => selection.id === seat.id); const classes = `seat-dot ${seat.status === "occupied" ? "is-occupied" : ""} ${selected ? "is-selected" : ""} ${seat.isAccessible ? "is-accessible" : ""} ${seat.aisleBefore ? "has-aisle" : ""}`; return <button key={seat.id} className={classes} disabled={seat.status === "occupied"} onClick={(event) => { event.stopPropagation(); toggleSeat(seat); }} aria-label={`Fileira ${seat.row}, assento ${seat.number}, ${seat.status === "occupied" ? "ocupado" : selected ? "selecionado" : "disponível"}`}>{seat.isAccessible ? "♿" : seat.isCompanion ? "✦" : seat.number}</button>; })}</div><span className="row-label">{row}</span></div>)}</div><div className="screen-base"><span>AVENGERS: DOOMSDAY</span></div></div></div><div className="map-float-controls"><button onClick={() => setZoom((value) => Math.min(1.6, Number((value + 0.1).toFixed(2))))} aria-label="Aumentar zoom"><ZoomIn size={16} /></button><button onClick={() => setZoom((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))))} aria-label="Diminuir zoom"><ZoomOut size={16} /></button></div></div>
                  <div className="seat-legend"><span><i className="legend-dot available" /> Disponível</span><span><i className="legend-dot selected" /> Selecionado</span><span><i className="legend-dot occupied" /> Ocupado</span><span><i className="legend-dot accessible" /> Acessível</span></div>
                </div>
                <div className="seat-note"><Info size={16} /><span>Os assentos são bloqueados temporariamente durante o checkout. A disponibilidade real depende da integração com o operador de cinemas.</span></div>
              </div>
              <aside className="flow-side"><OrderSummary cinema={selectedCinema} session={selectedSession} seats={seatSelections} total={total} onRemove={(id) => setSeatSelections((current) => current.filter((seat) => seat.id !== id))} onUpdateTicketType={updateTicketType} onContinue={() => { if (!seatSelections.length) { toast.error("Selecione ao menos um assento para continuar."); return; } setScreen("checkout"); }} /></aside>
            </div>
          ) : null}

          {screen === "checkout" ? (
            <div className="flow-grid checkout-grid">
              <div className="flow-main">
                <form className="panel checkout-panel" onSubmit={submitOrder}>
                  <div className="panel-heading"><div><span className="panel-index">04</span><h2>Finalize sua compra</h2><p>Preencha seus dados para receber o ingresso digital.</p></div><WalletCards size={22} /></div>
                  <div className="checkout-section"><div className="subheading"><UserRound size={17} /><div><strong>Dados do comprador</strong><span>Usados para identificação e envio do ingresso.</span></div></div><div className="form-grid"><Field label="Nome completo" value={buyer.name} onChange={(value) => setBuyer((current) => ({ ...current, name: value }))} placeholder="Digite seu nome" /><Field label="E-mail" type="email" value={buyer.email} onChange={(value) => setBuyer((current) => ({ ...current, email: value }))} placeholder="voce@email.com" /><Field label="CPF" value={buyer.document} onChange={(value) => setBuyer((current) => ({ ...current, document: value }))} placeholder="000.000.000-00" /></div></div>
                  <div className="checkout-section"><div className="subheading"><WalletCards size={17} /><div><strong>Forma de pagamento</strong><span>Modo demonstração — nenhum pagamento será processado.</span></div></div><div className="payment-options"><button type="button" className={`payment-option ${payment === "pix" ? "is-selected" : ""}`} onClick={() => setPayment("pix")}><span className="payment-icon pix-icon">◆</span><span><strong>Pix</strong><small>Aprovação imediata</small></span>{payment === "pix" ? <Check size={17} /> : null}</button><button type="button" className={`payment-option ${payment === "card" ? "is-selected" : ""}`} onClick={() => setPayment("card")}><span className="payment-icon"><WalletCards size={18} /></span><span><strong>Cartão de crédito</strong><small>Até 3x sem juros</small></span>{payment === "card" ? <Check size={17} /> : null}</button></div></div>
                  <div className="demo-warning"><Info size={17} /><span>{filmConfig.demoModeNotice}</span></div>{isEmptyPreview ? <div className="demo-validation-hint"><Info size={16} /> Validação QA: o botão de confirmação deve rejeitar dados incompletos e assentos ausentes.</div> : null}
                  <button className="button button-primary wide-button" type="submit" disabled={createDemoOrder.isPending}>{createDemoOrder.isPending ? "Gerando confirmação..." : "Confirmar pedido de demonstração"} {!createDemoOrder.isPending ? <ArrowRight size={17} /> : null}</button>
                </form>
              </div>
              <aside className="flow-side"><OrderSummary cinema={selectedCinema} session={selectedSession} seats={seatSelections} total={total} onRemove={(id) => setSeatSelections((current) => current.filter((seat) => seat.id !== id))} onUpdateTicketType={updateTicketType} /></aside>
            </div>
          ) : null}

          {screen === "confirmation" && order ? (
            <div className="confirmation-layout"><div className="confirmation-card"><div className="confirmation-icon"><Check size={30} /></div><span className="eyebrow">PEDIDO CONFIRMADO</span><h2>Seu lugar está reservado.</h2><p>Enviamos uma confirmação de demonstração para <strong>{order.buyer.email}</strong>.</p><div className="order-code"><span>CÓDIGO DO PEDIDO</span><strong>{order.code}</strong></div><div className="ticket-card"><div className="ticket-main"><span className="ticket-label">AVENGERS: DOOMSDAY</span><h3>{order.cinema.name}</h3><p>{order.cinema.city}, {order.cinema.uf} · {order.session.room}</p><div className="ticket-meta"><span><CalendarDays size={14} /> {order.session.dateLabel}</span><span><Clock3 size={14} /> {order.session.time}</span><span><Film size={14} /> {order.session.format}</span></div><div className="ticket-seats"><span>ASSENTOS</span><strong>{order.seats.map((seat) => `${seat.row}${seat.number}`).join(" · ")}</strong></div></div><div className="ticket-qr"><QRCodeCanvas value={`https://presale.doomsday.example/ticket/${order.code}`} size={132} bgColor="#f4f0e6" fgColor="#10141b" includeMargin /><span>APRESENTE NA ENTRADA</span></div></div>{isEmailErrorPreview ? <div className="demo-validation-hint"><Info size={16} /> QA: falha de envio simulada. O usuário recebe erro e pode tentar novamente.</div> : null}<div className="confirmation-actions"><button className="button button-primary" onClick={() => window.print()}><Download size={17} /> Baixar ingresso</button><button className="button button-secondary" disabled={sendDemoEmail.isPending} onClick={() => { if (isEmailErrorPreview) { toast.error("Não foi possível enviar a confirmação. Tente novamente."); return; } sendDemoEmail.mutate({ orderCode: order.code, email: order.buyer.email }, { onSuccess: (result) => toast.success(`Confirmação enviada para ${result.to} · ${result.messageId}`), onError: (error) => toast.error(error.message) }); }}><Mail size={17} /> {sendDemoEmail.isPending ? "Enviando..." : "Enviar por e-mail"}</button></div><button className="text-button" onClick={resetFlow}>Comprar outro ingresso <ArrowRight size={15} /></button></div><div className="confirmation-side"><div className="side-stat"><span>STATUS</span><strong><span className="pulse-dot" /> PRONTO PARA APRESENTAR</strong></div><div className="side-stat"><span>FORMA DE PAGAMENTO</span><strong>{payment === "pix" ? "Pix" : "Cartão de crédito"}</strong></div><div className="side-stat"><span>TOTAL</span><strong className="accent-value">{currency(order.total)}</strong></div><div className="scan-card"><ScanLine size={25} /><strong>Uma experiência digna da tela grande.</strong><span>O QR Code acima é uma credencial digital de demonstração.</span></div></div></div>
          ) : null}
        </section>
      ) : null}

      {screen === "discover" ? <footer className="site-footer container"><div><span className="brand-mark small">A</span><span>AVENGERS: DOOMSDAY / PRÉ-VENDA CONCEITUAL</span></div><span>Dados de cinema: catálogo público de referência. Sessões, disponibilidade e pagamentos aguardam integração oficial.</span></footer> : null}
    </main>
  );
}

function OrderSummary({ cinema, session, seats, total, onRemove, onUpdateTicketType, onContinue }: { cinema: Cinema; session: Session; seats: SeatSelection[]; total: number; onRemove: (id: string) => void; onUpdateTicketType?: (seatId: string, ticketType: TicketType) => void; onContinue?: () => void }) {
  return <div className="order-summary"><div className="summary-heading"><div><span className="eyebrow"><ShoppingBag size={14} /> RESUMO DO PEDIDO</span><h2>Seu pedido</h2></div><span className="summary-count">{seats.length}</span></div><div className="summary-film"><div className="summary-poster"><img src={LOGO_URL} alt="Avengers Doomsday" /></div><div><strong>Avengers: Doomsday</strong><span>{cinema.name}</span><span>{session.dateLabel} · {session.time} · {session.format}</span></div></div><div className="summary-divider" /><div className="summary-location"><MapPin size={15} /><span>{cinema.city}, {cinema.uf}<small>{session.room}</small></span></div><div className="summary-items">{seats.length ? seats.map((seat) => <div className="summary-item" key={seat.id}><div><strong>Assento {seat.row}{seat.number}</strong>{onUpdateTicketType ? <select className="ticket-type-select" value={seat.ticketType} onChange={(event) => onUpdateTicketType(seat.id, event.target.value as TicketType)} aria-label={`Tipo de ingresso do assento ${seat.row}${seat.number}`}><option value="inteira">Inteira</option><option value="meia">Meia-entrada</option></select> : <span>{seat.ticketType === "meia" ? "Meia-entrada" : "Inteira"}</span>}</div><div><span>{currency(seat.ticketType === "meia" ? HALF_PRICE : session.price)}</span><button onClick={() => onRemove(seat.id)} aria-label={`Remover assento ${seat.row}${seat.number}`}><Trash2 size={14} /></button></div></div>) : <div className="summary-empty"><Ticket size={20} /><span>Escolha seus assentos para montar o pedido.</span></div>}</div><div className="summary-totals"><span>Ingressos <strong>{currency(total)}</strong></span><span>Taxa de serviço <strong>{seats.length ? currency(0) : currency(0)}</strong></span><div><span>Total</span><strong>{currency(total)}</strong></div></div>{onContinue ? <button className="button button-primary wide-button" onClick={onContinue}>Ir para pagamento <ArrowRight size={17} /></button> : null}<p className="summary-safe"><span className="pulse-dot" /> Ambiente de demonstração protegido</p></div>;
}
