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
  Copy,
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
  RefreshCw,
  ScanLine,
  ShoppingBag,
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
import { getCheckoutScreen, getPreviousScreen, getScreenAfterPixStatus, getSeatsScreen } from "@/lib/flow-navigation";
import { hasCompleteLocation } from "@/lib/location-selection";
import { canConfirmPixCheckout, isCheckoutPurchaseReady } from "@/lib/pix-confirmation";
import { scrollToPurchaseFlow } from "@/lib/scroll";
import { getAccessibleRearRowIndex, getBottomUpSeatRows } from "@/lib/seat-map-orientation";
import { trpc } from "@/lib/trpc";
import { filmConfig } from "@shared/film-config";
import { formatCpfInput, formatPhoneInput } from "@shared/input-masks";

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
type TicketQuantities = Record<TicketType, number>;

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

type PixPayment = {
  orderCode: string;
  status: string;
  amount: number;
  pixCode: string;
  pixImageUrl: string | null;
};

const HERO_URL = "/assets/avengers-doomsday-hero.webp";
const LOGO_URL = "/assets/avengers-doomsday-logo.webp";
const HERO_TRANSITION_URL = "/assets/doomsday-opening-transition.mp4";
const EVENT_ART_URL = "/assets/doomsday-event-art.webp";
const DIVIDER_ART_URL = "/assets/doomsday-divider-art.webp";
const WHOLE_PRICE = 51.28;
const HALF_PRICE = 25.64;
const MAX_TICKETS_PER_ORDER = 8;
const EMPTY_TICKET_QUANTITIES: TicketQuantities = { inteira: 0, meia: 0 };

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
  return { uf: "", city: "" };
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).replace(".", "").toUpperCase();
}

function buildSessions(cinema: Cinema, date: string): Session[] {
  const seed = hashString(cinema.name);
  const sessionDate = new Date(`${date}T00:00:00Z`);
  const sessions = [
    { time: "13:20", language: "Dublado", format: "2D" as const },
    { time: "15:30", language: "Legendado", format: "3D" as const },
    { time: "18:10", language: "Legendado", format: "2D" as const },
    { time: "21:25", language: "Dublado", format: "2D" as const },
  ];
  return sessions.map((session, index) => ({
    id: `${slug(cinema.name)}-${date}-${session.time.replace(":", "")}`,
    date,
    dateLabel: formatDateLabel(sessionDate),
    time: session.time,
    language: session.language,
    format: session.format,
    room: `Sala ${(seed + index) % 5 + 1}`,
    price: WHOLE_PRICE,
  }));
}

function buildPresaleDates() {
  const releaseDate = new Date(`${filmConfig.releaseDate}T00:00:00Z`);
  return Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(releaseDate);
    date.setUTCDate(date.getUTCDate() + offset);
    return {
      value: date.toISOString().slice(0, 10),
      label: formatDateLabel(date),
      weekday: date.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "").toUpperCase(),
    };
  });
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
        isAccessible: rowIndex === getAccessibleRearRowIndex() && [2, columns - 1].includes(number),
        isCompanion: rowIndex === getAccessibleRearRowIndex() && [3, columns - 2].includes(number),
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

function Field({ label, value, onChange, placeholder, type = "text", inputMode, autoComplete }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; inputMode?: "text" | "email" | "numeric" | "tel"; autoComplete?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} autoComplete={autoComplete} />
    </label>
  );
}

export default function Home() {
  const stateOptions = useMemo(() => {
    const unique = new Map<string, { name: string; uf: string }>();
    cinemaCatalog.forEach((cinema) => unique.set(cinema.uf, { name: cinema.state, uf: cinema.uf }));
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, []);
  const [screen, setScreen] = useState<Screen>(() => getRequestedScreen());
  const [isHeroVideoVisible, setIsHeroVideoVisible] = useState(true);
  const [isHeroVideoReady, setIsHeroVideoReady] = useState(false);
  const [isHeroIntroPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("intro") === "1");
  const [isDemoPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("screen"));
  const [isLocalApprovedPixPreview] = useState(() => import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("pixApproved") === "1");
  const [isEmptyPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("empty") === "1");
  const [isEmailErrorPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("emailError") === "1");
  const [isNoCinemaPreview] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("noCinemas") === "1");
  const [selectedState, setSelectedState] = useState(() => getInitialLocation().uf);
  const [selectedCity, setSelectedCity] = useState(() => getInitialLocation().city);
  const noCinemaScenario = isNoCinemaPreview && selectedState === "SP" && selectedCity === "São Paulo";
  const [selectedCinemaName, setSelectedCinemaName] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(filmConfig.releaseDate);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [ticketQuantities, setTicketQuantities] = useState<TicketQuantities>(EMPTY_TICKET_QUANTITIES);
  const [seatSelections, setSeatSelections] = useState<SeatSelection[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0 });
  const [buyer, setBuyer] = useState({ name: "", email: "", document: "", phone: "" });
  const [payment] = useState<"pix">("pix");
  const createPixPayment = trpc.presale.createPixPayment.useMutation();
  const sendDemoEmail = trpc.presale.sendDemoConfirmationEmail.useMutation();
  const [order, setOrder] = useState<Order | null>(null);
  const [pixPayment, setPixPayment] = useState<PixPayment | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

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

  const isLocationComplete = hasCompleteLocation(selectedState, selectedCity, selectedCinemaName) && !noCinemaScenario;

  const selectedCinema = useMemo<Cinema>(() => {
    if (noCinemaScenario) {
      return {
        name: "Nenhum cinema disponível",
        city: selectedCity,
        state: stateOptions.find((state) => state.uf === selectedState)?.name ?? selectedState,
        uf: selectedState,
      };
    }
    return cinemaCatalog.find((cinema) => cinema.uf === selectedState && cinema.city === selectedCity && cinema.name === selectedCinemaName) ?? {
      name: "Selecione um cinema",
      city: selectedCity,
      state: stateOptions.find((state) => state.uf === selectedState)?.name ?? "",
      uf: selectedState,
    };
  }, [cinemasForCity, noCinemaScenario, selectedCinemaName, selectedCity, selectedState, stateOptions]);

  const presaleDates = useMemo(() => buildPresaleDates(), []);
  const sessions = useMemo(() => isLocationComplete ? buildSessions(selectedCinema, selectedDate) : [], [isLocationComplete, selectedCinema, selectedDate]);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? {
    id: "",
    date: selectedDate,
    dateLabel: "",
    time: "",
    language: "",
    format: "2D" as const,
    room: "",
    price: WHOLE_PRICE,
  };
  const isSessionSelected = sessions.some((session) => session.id === selectedSessionId);
  const seats = useMemo(() => isLocationComplete ? buildSeats(selectedCinema.name, selectedSession.id) : [], [isLocationComplete, selectedCinema.name, selectedSession.id]);
  const rows = useMemo(() => getBottomUpSeatRows(Array.from(new Set(seats.map((seat) => seat.row)))), [seats]);
  const plannedTicketTypes = useMemo<TicketType[]>(() => [
    ...Array.from({ length: ticketQuantities.inteira }, () => "inteira" as const),
    ...Array.from({ length: ticketQuantities.meia }, () => "meia" as const),
  ], [ticketQuantities]);
  const ticketQuantity = plannedTicketTypes.length;
  const plannedTotal = Number((ticketQuantities.inteira * selectedSession.price + ticketQuantities.meia * HALF_PRICE).toFixed(2));
  const total = seatSelections.reduce((sum, seat) => sum + (seat.ticketType === "meia" ? HALF_PRICE : selectedSession.price), 0);
  const pixStatusInput = useMemo(() => ({ orderCode: pixPayment?.orderCode ?? "PENDING" }), [pixPayment?.orderCode]);
  const pixPaymentStatus = trpc.presale.getPixPaymentStatus.useQuery(pixStatusInput, { enabled: Boolean(pixPayment), retry: false, refetchInterval: pixPayment ? 3000 : false });
  const effectivePixStatus = isLocalApprovedPixPreview ? "PAID" : pixPaymentStatus.data?.status;

  useEffect(() => {
    setSelectedSessionId("");
    setTicketQuantities(EMPTY_TICKET_QUANTITIES);
    setSeatSelections([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedCinema.name, selectedDate]);

  useEffect(() => {
    if (screen !== "seats") setIsDragging(false);
  }, [screen]);

  useEffect(() => {
    const checkoutReady = isCheckoutPurchaseReady({ hasBuyer: Boolean(buyer.name && buyer.email), selectedSeatCount: seatSelections.length, ticketQuantity, amount: total });
    if (!isLocalApprovedPixPreview || screen !== "checkout" || pixPayment || !checkoutReady) return;
    setPixPayment({ orderCode: "DD-QA-PAID", status: "PAID", amount: total, pixCode: "QA_LOCAL_APPROVED_PIX", pixImageUrl: null });
  }, [buyer.email, buyer.name, isLocalApprovedPixPreview, pixPayment, screen, seatSelections.length, ticketQuantity, total]);

  useEffect(() => {
    if (!pixPayment || !canConfirmPixCheckout({ screen, status: effectivePixStatus, hasPayment: true, hasOrder: Boolean(order), hasBuyer: Boolean(buyer.name && buyer.email), selectedSeatCount: seatSelections.length, ticketQuantity, amount: pixPayment.amount })) return;
    setOrder({
      code: pixPayment.orderCode,
      createdAt: new Date().toISOString(),
      buyer,
      payment: "pix",
      session: selectedSession,
      cinema: selectedCinema,
      seats: seatSelections.map(({ id, row, number, ticketType }) => ({ id, row, number, ticketType })),
      total: pixPayment.amount,
    });
    setScreen("confirmation");
    window.setTimeout(() => document.getElementById("purchase-flow")?.scrollIntoView({ behavior: "smooth" }), 20);
  }, [buyer, effectivePixStatus, order, pixPayment, screen, seatSelections, selectedCinema, selectedSession]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setIsHeroVideoVisible(false);
      return;
    }

    const video = heroVideoRef.current;
    if (video) {
      video.playbackRate = 1;
      video.play().catch(() => setIsHeroVideoVisible(false));
    }
  }, [isHeroIntroPreview]);

  useEffect(() => {
    if (!isDemoPreview || isEmptyPreview || screen === "discover" || !seats.length) return;
    const demoSeats = seats.filter((seat) => seat.status === "available").slice(0, 2).map((seat) => ({ ...seat, ticketType: "inteira" as const }));
    if (!seatSelections.length) {
      setSelectedSessionId(selectedSession.id);
      setTicketQuantities({ inteira: 2, meia: 0 });
      setSeatSelections(demoSeats);
    }
    setBuyer((current) => current.name && current.email ? current : { name: "Cliente de demonstração", email: "cliente@exemplo.com", document: "00000000000", phone: "11999999999" });
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
    setSelectedCity("");
    setSelectedCinemaName("");
    setSelectedDate(filmConfig.releaseDate);
    setSelectedSessionId("");
    setTicketQuantities(EMPTY_TICKET_QUANTITIES);
    setSeatSelections([]);
  };

  const selectCity = (city: string) => {
    setSelectedCity(city);
    setSelectedCinemaName("");
    setSelectedSessionId("");
    setTicketQuantities(EMPTY_TICKET_QUANTITIES);
    setSeatSelections([]);
  };

  const startSessions = () => {
    setScreen("sessions");
    window.setTimeout(() => document.getElementById("purchase-flow")?.scrollIntoView({ behavior: "smooth" }), 20);
  };

  const selectSessionDate = (date: string) => {
    if (date === selectedDate) return;
    setSelectedDate(date);
    setSelectedSessionId("");
    setTicketQuantities(EMPTY_TICKET_QUANTITIES);
    setSeatSelections([]);
  };

  const selectSession = (sessionId: string) => {
    if (sessionId === selectedSessionId) return;
    setSelectedSessionId(sessionId);
    setTicketQuantities(EMPTY_TICKET_QUANTITIES);
    setSeatSelections([]);
  };

  const updateTicketQuantity = (ticketType: TicketType, direction: 1 | -1) => {
    const next = { ...ticketQuantities, [ticketType]: Math.max(0, ticketQuantities[ticketType] + direction) };
    if (next.inteira + next.meia > MAX_TICKETS_PER_ORDER) {
      toast.error(`O limite é de ${MAX_TICKETS_PER_ORDER} ingressos por pedido.`);
      return;
    }
    setTicketQuantities(next);
    setSeatSelections([]);
  };

  const startSeats = (session: Session) => {
    if (!isLocationComplete) {
      toast.error("Escolha estado, cidade e cinema antes de consultar ingressos.");
      return;
    }
    if (!isSessionSelected || ticketQuantity === 0) {
      toast.error("Escolha uma sessão e informe a quantidade de ingressos antes de continuar.");
      return;
    }
    setSelectedSessionId(session.id);
    setSeatSelections([]);
    setScreen(getSeatsScreen());
    window.setTimeout(() => document.getElementById("purchase-flow")?.scrollIntoView({ behavior: "smooth" }), 20);
  };

  const toggleSeat = (seat: Seat) => {
    if (seat.status === "occupied") return;
    setSeatSelections((current) => {
      const existing = current.find((selected) => selected.id === seat.id);
      if (existing) return current.filter((selected) => selected.id !== seat.id);
      if (current.length >= ticketQuantity) {
        toast.error(`Você solicitou ${ticketQuantity} ingresso${ticketQuantity > 1 ? "s" : ""}. Remova um assento ou ajuste a quantidade.`);
        return current;
      }
      const nextTicketType = (Object.keys(ticketQuantities) as TicketType[]).find((ticketType) => current.filter((selected) => selected.ticketType === ticketType).length < ticketQuantities[ticketType]) ?? "inteira";
      return [...current, { ...seat, ticketType: nextTicketType }];
    });
  };

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!buyer.name || !buyer.email || !buyer.document || !buyer.phone || seatSelections.length !== ticketQuantity) {
      toast.error(ticketQuantity ? `Preencha seus dados e selecione os ${ticketQuantity} assentos solicitados.` : "Selecione sua sessão e a quantidade de ingressos.");
      return;
    }
    createPixPayment.mutate(
      {
        buyer,
        cinema: selectedCinema,
        session: selectedSession,
        seats: seatSelections.map(({ id, row, number, ticketType }) => ({ id, row, number, ticketType })),
      },
      {
        onSuccess: (createdPayment) => {
          setPixPayment(createdPayment as PixPayment);
          toast.success("Código PIX gerado. Conclua o pagamento para garantir seus assentos.");
        },
        onError: (error) => toast.error(error.message || "Não foi possível gerar a cobrança PIX."),
      },
    );
  };

  const verifyPixPayment = async () => {
    const result = await pixPaymentStatus.refetch();
    if (result.data?.status !== "PAID") {
      toast.message("Pagamento ainda pendente. Assim que a AmploPay confirmar, seus assentos serão liberados.");
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.seat-dot')) return;
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
    setPixPayment(null);
    setSelectedDate(filmConfig.releaseDate);
    setSelectedSessionId("");
    setTicketQuantities(EMPTY_TICKET_QUANTITIES);
    setSeatSelections([]);
    setBuyer({ name: "", email: "", document: "", phone: "" });
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 20);
  };

  const goBack = () => {
    const previousScreen = getPreviousScreen(screen);
    if (previousScreen === "discover") resetFlow();
    else setScreen(previousScreen);
  };

  return (
    <main className="presale-shell">
      <header className="site-header site-header-minimal">
        <nav className="header-nav" aria-label="Navegação principal">
          <button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>O filme</button>
          <button onClick={() => document.getElementById("purchase-flow")?.scrollIntoView({ behavior: "smooth" })}>Comprar ingressos</button>
          <span className="header-status"><span className="pulse-dot" /> PRÉ-VENDA AO VIVO</span>
        </nav>
      </header>

      {screen === "discover" ? (
        <>
          <section className="hero-section">
            <div className={`hero-art ${isHeroVideoVisible && !isHeroVideoReady ? "is-hidden" : ""}`} style={{ backgroundImage: `url(${HERO_URL})` }} />
            <div className={`hero-transition ${isHeroVideoVisible ? "" : "is-hidden"} ${isHeroVideoReady ? "is-ready" : ""}`} aria-hidden={!isHeroVideoVisible}>
              <video ref={heroVideoRef} src={HERO_TRANSITION_URL} autoPlay muted playsInline preload="auto" loop={isHeroIntroPreview} onPlaying={() => setIsHeroVideoReady(true)} onEnded={() => setIsHeroVideoVisible(false)} onError={() => setIsHeroVideoVisible(false)} />
            </div>
            <div className="hero-overlay" />
            <div className="presale-flag" aria-label="Pré-venda aberta">
              <span>PRÉ-VENDA</span>
              <strong>ABERTA</strong>
            </div>
            <div className="hero-content container">
              <div className="hero-copy">
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

          <section id="about" className="event-chapter">
            <div className="event-art" aria-hidden="true" style={{ backgroundImage: `url(${EVENT_ART_URL})` }} />
            <div className="event-art-overlay" aria-hidden="true" />
            <div className="container event-chapter-content">
              <div className="event-story">
                <div className="section-kicker event-kicker"><span>01</span><span>O EVENTO</span></div>
                <span className="event-overline">UM ENCONTRO QUE MUDA TUDO</span>
                <h1>Três universos.<br /><em>Uma última escolha.</em></h1>
                <p className="event-intro">{filmConfig.synopsis}</p>
                <p className="event-detail">Prepare-se para ver heróis de mundos distintos frente a frente em uma experiência criada para a tela grande. Escolha seu cinema, garanta seu lugar e viva o primeiro dia desse evento nos cinemas.</p>
                <div className="event-actions">
                  <button className="button button-primary" onClick={startSessions}><MapPin size={17} /> Conferir disponibilidade <ArrowRight size={17} /></button>
                  <span><CalendarDays size={15} /> Estreia em {filmConfig.releaseDateLabel}</span>
                </div>
              </div>

              <aside className="event-brief" aria-label="Informações do lançamento">
                <div className="event-brief-top"><span>ARQUIVO DE LANÇAMENTO</span><span className="event-live-dot"><i /> PRÉ-VENDA AO VIVO</span></div>
                <div className="event-date"><span>ESTREIA NOS CINEMAS</span><strong>{filmConfig.releaseDate.replaceAll("-", ".")}</strong><small>Uma data. Todos os universos.</small></div>
                <div className="event-facts">
                  <div><span>DIREÇÃO</span><strong>RUSSO BROTHERS</strong></div>
                  <div><span>EXPERIÊNCIA</span><strong>EXCLUSIVA PARA CINEMA</strong></div>
                </div>
                <div className="format-stack"><span>ESCOLHA SUA TELA</span><div><b>2D</b><b>3D</b><b>IMAX</b></div><small>Os formatos variam conforme a sessão e o cinema selecionado.</small></div>
              </aside>
            </div>
          </section>

          <section className="presale-journey container" aria-labelledby="journey-title">
            <div className="journey-heading"><div><span className="section-number">02</span><span className="eyebrow">SEU CAMINHO ATÉ A ESTREIA</span></div><h2 id="journey-title">A pré-venda começa<br /><em>com a sua escolha.</em></h2><p>Você escolhe onde assistir, encontra a sessão certa e reserva seus assentos em poucos passos.</p></div>
            <div className="journey-grid">
              <article className="journey-card"><span className="journey-index">01</span><MapPin size={25} /><h3>Encontre seu cinema</h3><p>Confira a disponibilidade por estado, cidade e rede de exibição.</p><button onClick={startSessions}>Ver cinemas <ArrowRight size={16} /></button></article>
              <article className="journey-card"><span className="journey-index">02</span><Clock3 size={25} /><h3>Escolha a melhor sessão</h3><p>Compare horários, idiomas e formatos para viver o evento do seu jeito.</p><span className="journey-caption">2D · 3D · IMAX</span></article>
              <article className="journey-card journey-card-featured"><span className="journey-index">03</span><Ticket size={25} /><h3>Garanta seu lugar</h3><p>Veja o mapa da sala, selecione seus assentos e avance para o pedido.</p><span className="journey-caption">ASSENTOS POR CINEMA</span></article>
            </div>
          </section>

          <section className="availability-spotlight" style={{ "--divider-art": `url(${DIVIDER_ART_URL})` } as React.CSSProperties}>
            <div className="availability-texture" aria-hidden="true" />
            <div className="container availability-layout">
              <div className="availability-copy"><span className="eyebrow"><Globe2 size={14} /> PRÉ-VENDA NACIONAL</span><h2>Seu lugar no <em>dia do juízo</em><br />começa aqui.</h2><p>Descubra onde <strong>Avengers: Doomsday</strong> estará em cartaz e encontre a sessão ideal antes que a estreia chegue.</p><button className="button button-primary" onClick={startSessions}><Ticket size={17} /> Comprar ingressos <ArrowRight size={17} /></button><small><Info size={14} /> Sessões e disponibilidade podem variar por cinema.</small></div>
              <div className="availability-console">
                <div className="console-heading"><span>RADAR DE DISPONIBILIDADE</span><i><span className="pulse-dot" /> ATUALIZANDO</i></div>
                <div className="availability-metrics"><div><strong>{cinemaCatalog.length}</strong><span>cinemas no catálogo</span></div><div><strong>{stateOptions.length}</strong><span>estados disponíveis</span></div></div>
                <div className="availability-location"><div><MapPin size={19} /><span>LOCALIZAÇÃO SELECIONADA</span></div><strong>{selectedCity}, {selectedState}</strong><small>{selectedCinema.name}</small></div>
                <button className="console-action" onClick={startSessions}>Conferir sessões nesta região <ArrowRight size={16} /></button>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {screen !== "discover" ? (
        <section id="purchase-flow" className="purchase-stage container">
          <div className="flow-heading">
            <div className="flow-heading-copy">
              <button type="button" className="flow-back" onClick={goBack} aria-label="Voltar para a etapa anterior">
                <ArrowLeft size={15} /> Voltar
              </button>
              <div>
                <span className="eyebrow"><Ticket size={14} /> FLUXO DE PRÉ-VENDA</span>
                <h1>{screen === "confirmation" ? "Seu ingresso está garantido." : "Reserve seu lugar no evento."}</h1>
              </div>
            </div>
            <StepIndicator current={screen} />
          </div>

          {screen === "sessions" ? (
            <div className="flow-grid">
              <div className="flow-main">
                <div className="panel panel-location">
                  <div className="panel-heading"><div><span className="panel-index">01</span><h2>Escolha sua localização</h2><p>A disponibilidade varia por cinema e região.</p></div><Globe2 size={22} /></div>
                  <div className="select-grid">
                    <label className="select-field"><span>Estado</span><select value={selectedState} onChange={(event) => selectState(event.target.value)}><option value="" disabled>Escolha seu estado</option>{stateOptions.map((state) => <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>)}</select></label>
                    <label className="select-field"><span>Cidade</span><select value={selectedCity} disabled={!selectedState} onChange={(event) => selectCity(event.target.value)}><option value="" disabled>{selectedState ? "Escolha sua cidade" : "Escolha primeiro um estado"}</option>{citiesForState.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
                    <label className="select-field select-field-wide"><span>Cinema</span><select value={selectedCinemaName} disabled={!selectedCity || noCinemaScenario} onChange={(event) => setSelectedCinemaName(event.target.value)}><option value="" disabled>{noCinemaScenario ? "Nenhum cinema disponível" : selectedCity ? "Escolha seu cinema" : "Escolha primeiro uma cidade"}</option>{cinemasForCity.map((cinema) => <option key={cinema.name} value={cinema.name}>{cinema.name}</option>)}</select></label>
                  </div>{noCinemaScenario ? <div className="demo-validation-hint location-empty-hint"><Info size={16} /> Nenhum cinema encontrado para esta combinação. Altere estado ou cidade para tentar novamente.</div> : null}
                </div>
                <div className="panel session-panel">
                  <div className="panel-heading"><div><span className="panel-index">02</span><h2>Escolha uma sessão</h2><p>{isLocationComplete ? `${selectedCinema.name} · ${selectedCity}, ${selectedState}` : "Conclua estado, cidade e cinema para ver as sessões."}</p></div><CalendarDays size={22} /></div>
                  {!isLocationComplete ? <div className="location-required-hint"><Info size={16} /> Selecione seu estado, cidade e cinema acima para liberar horários e ingressos.</div> : null}
                  <div className="date-strip" aria-label="Datas disponíveis para pré-venda">{presaleDates.map((date) => <button type="button" disabled={!isLocationComplete} className={`date-chip ${isLocationComplete && selectedDate === date.value ? "is-active" : ""}`} key={date.value} onClick={() => selectSessionDate(date.value)}><strong>{date.label}</strong><span>{date.weekday}</span></button>)}</div>
                  <div className="session-list">{!isLocationComplete || isEmptyPreview || noCinemaScenario ? <div className="summary-empty session-empty"><Info size={20} /><span>{!isLocationComplete ? "Escolha uma localização completa para consultar as sessões disponíveis." : noCinemaScenario ? "Nenhuma sessão disponível porque não há cinema selecionado." : "Nenhuma sessão disponível para este cinema na data selecionada."}</span></div> : sessions.map((session) => { const isSelected = selectedSessionId === session.id; return <div className={`session-choice ${isSelected ? "is-expanded" : ""}`} key={session.id}><button type="button" className={`session-card ${isSelected ? "is-highlighted" : ""}`} onClick={() => selectSession(session.id)}><span className="session-time"><Clock3 size={16} /><strong>{session.time}</strong><small>{session.room}</small></span><span className="session-details"><strong>{session.language}</strong><span>{session.format} · Tela premium</span></span><span className="session-price">{currency(session.price)}<small>por inteira</small></span><span className="session-arrow"><ArrowRight size={18} /></span></button>{isSelected ? <TicketConfigurator quantities={ticketQuantities} session={session} total={plannedTotal} onChange={updateTicketQuantity} /> : null}</div>; })}</div>
                  <button className="button button-primary wide-button" disabled={!isLocationComplete || isEmptyPreview || noCinemaScenario || !isSessionSelected || ticketQuantity === 0} onClick={() => startSeats(selectedSession)}>{!isLocationComplete ? "Escolha sua localização primeiro" : `Escolher ${ticketQuantity ? `${ticketQuantity} assento${ticketQuantity > 1 ? "s" : ""}` : "assentos"}`} <ArrowRight size={17} /></button>
                </div>
              </div>
              <aside className="flow-side"><OrderSummary cinema={selectedCinema} session={selectedSession} seats={seatSelections} plannedTicketTypes={plannedTicketTypes} total={total} plannedTotal={plannedTotal} onRemove={(id) => setSeatSelections((current) => current.filter((seat) => seat.id !== id))} /></aside>
            </div>
          ) : null}

          {screen === "seats" ? (
            <div className="flow-grid seats-grid-layout">
              <div className="flow-main">
                <div className="panel seat-panel">
                  <div className="panel-heading"><div><span className="panel-index">03</span><h2>Escolha seus assentos</h2><p>{selectedCinema.name} · {selectedSession.room} · {selectedSession.dateLabel} às {selectedSession.time}</p></div><Grid3X3 size={22} /></div>
                  <div className="map-toolbar"><div className="map-help"><Move size={16} /> Arraste para navegar <span>•</span> use os controles para aproximar</div><div className="zoom-controls"><button onClick={() => setZoom((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))))} aria-label="Diminuir zoom"><Minus size={16} /></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => setZoom((value) => Math.min(1.6, Number((value + 0.1).toFixed(2))))} aria-label="Aumentar zoom"><Plus size={16} /></button><button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Redefinir mapa">Reset</button></div></div>
                  <div className="seat-map-wrap" ref={mapRef}><div className="seat-map-canvas" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} style={{ cursor: isDragging ? "grabbing" : "grab" }}><div className="seat-map" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}><div className="screen-label">AVENGERS: DOOMSDAY</div><div className="seat-rows">{rows.map((row) => <div className="seat-row" key={row}><span className="row-label">{row}</span><div className="seat-row-items">{seats.filter((seat) => seat.row === row).map((seat) => { const selected = seatSelections.some((selection) => selection.id === seat.id); const classes = `seat-dot ${seat.status === "occupied" ? "is-occupied" : ""} ${selected ? "is-selected" : ""} ${seat.isAccessible ? "is-accessible" : ""} ${seat.aisleBefore ? "has-aisle" : ""}`; return <button key={seat.id} className={classes} disabled={seat.status === "occupied"} onClick={(event) => { event.stopPropagation(); toggleSeat(seat); }} aria-label={`Fileira ${seat.row}, assento ${seat.number}, ${seat.status === "occupied" ? "ocupado" : selected ? "selecionado" : "disponível"}`}>{seat.isAccessible ? "♿" : seat.isCompanion ? "✦" : seat.number}</button>; })}</div><span className="row-label">{row}</span></div>)}</div><div className="screen-base"><span>TELA</span></div></div></div><div className="map-float-controls"><button onClick={() => setZoom((value) => Math.min(1.6, Number((value + 0.1).toFixed(2))))} aria-label="Aumentar zoom"><ZoomIn size={16} /></button><button onClick={() => setZoom((value) => Math.max(0.75, Number((value - 0.1).toFixed(2))))} aria-label="Diminuir zoom"><ZoomOut size={16} /></button></div></div>
                  <div className="seat-legend"><span><i className="legend-dot available" /> Disponível</span><span><i className="legend-dot selected" /> Selecionado</span><span><i className="legend-dot occupied" /> Ocupado</span><span><i className="legend-dot accessible" /> Acessível</span></div>
                </div>
                <div className="seat-note"><Info size={16} /><span>Os assentos são bloqueados temporariamente durante o checkout. A disponibilidade real depende da integração com o operador de cinemas.</span></div>
              </div>
              <aside className="flow-side"><OrderSummary cinema={selectedCinema} session={selectedSession} seats={seatSelections} plannedTicketTypes={plannedTicketTypes} total={total} plannedTotal={plannedTotal} onRemove={(id) => setSeatSelections((current) => current.filter((seat) => seat.id !== id))} onContinue={() => { if (seatSelections.length !== ticketQuantity) { toast.error(ticketQuantity ? `Selecione os ${ticketQuantity} assentos solicitados para continuar.` : "Informe a quantidade de ingressos antes de continuar."); return; } setScreen(getCheckoutScreen()); window.setTimeout(scrollToPurchaseFlow, 20); }} /></aside>
            </div>
          ) : null}

          {screen === "checkout" ? (
            <div className="flow-grid checkout-grid">
              <div className="flow-main">
                <form className="panel checkout-panel" onSubmit={submitOrder}>
                  <div className="panel-heading"><div><span className="panel-index">04</span><h2>Finalize sua compra</h2><p>Preencha seus dados para receber o ingresso digital.</p></div><WalletCards size={22} /></div>
                  <div className="checkout-section"><div className="subheading"><UserRound size={17} /><div><strong>Dados do comprador</strong><span>Usados para identificação e envio do ingresso.</span></div></div><div className="form-grid"><Field label="Nome completo" value={buyer.name} onChange={(value) => setBuyer((current) => ({ ...current, name: value }))} placeholder="Digite seu nome" autoComplete="name" /><Field label="E-mail" type="email" value={buyer.email} onChange={(value) => setBuyer((current) => ({ ...current, email: value }))} placeholder="voce@email.com" inputMode="email" autoComplete="email" /><Field label="CPF" value={buyer.document} onChange={(value) => setBuyer((current) => ({ ...current, document: formatCpfInput(value) }))} placeholder="000.000.000-00" inputMode="numeric" autoComplete="off" /><Field label="Celular com DDD" value={buyer.phone} onChange={(value) => setBuyer((current) => ({ ...current, phone: formatPhoneInput(value) }))} placeholder="(11) 99999-9999" inputMode="tel" autoComplete="tel" /></div></div>
                  <div className="checkout-section"><div className="subheading"><WalletCards size={17} /><div><strong>Forma de pagamento</strong><span>PIX via AmploPay — confirmação automática e segura.</span></div></div><div className="payment-options"><div className="payment-option is-selected"><span className="payment-icon pix-icon">◆</span><span><strong>Pix</strong><small>QR Code e código copia e cola</small></span><Check size={17} /></div></div></div>
                  {pixPayment ? <div className="pix-payment-panel"><div className="pix-payment-heading"><div><span className="panel-index">PAGAMENTO PIX</span><h3>Aguardando confirmação</h3><p>Use o QR Code ou copie o código para pagar no aplicativo do seu banco.</p></div><span>{currency(pixPayment.amount)}</span></div><div className="pix-payment-content">{pixPayment.pixImageUrl ? <img src={pixPayment.pixImageUrl} alt="QR Code para pagamento PIX" className="pix-payment-qr" /> : <QRCodeCanvas value={pixPayment.pixCode} size={150} bgColor="#f4f0e6" fgColor="#10141b" includeMargin />}<div className="pix-payment-code"><span>CÓDIGO COPIA E COLA</span><code>{pixPayment.pixCode}</code><button type="button" className="button button-secondary" onClick={() => { navigator.clipboard.writeText(pixPayment.pixCode).then(() => toast.success("Código PIX copiado."), () => toast.error("Não foi possível copiar o código PIX.")); }}><Copy size={16} /> Copiar código</button></div></div><div className="pix-payment-actions"><span><span className="pulse-dot" /> {pixPaymentStatus.data?.status === "PAID" ? "Pagamento confirmado" : "Aguardando pagamento"}</span><button type="button" className="text-button" onClick={verifyPixPayment} disabled={pixPaymentStatus.isFetching}><RefreshCw size={15} /> {pixPaymentStatus.isFetching ? "Verificando..." : "Já paguei"}</button></div></div> : null}
                  <div className="demo-warning"><Info size={17} /><span>O valor e os dados da cobrança são calculados no servidor. A confirmação acontece por notificação segura da AmploPay.</span></div>{isEmptyPreview ? <div className="demo-validation-hint"><Info size={16} /> Validação QA: o botão de geração PIX deve rejeitar dados incompletos e assentos ausentes.</div> : null}
                  <button className="button button-primary wide-button" type="submit" disabled={createPixPayment.isPending || Boolean(pixPayment)}>{createPixPayment.isPending ? "Gerando PIX..." : pixPayment ? "PIX gerado" : "Gerar código PIX"} {!createPixPayment.isPending && !pixPayment ? <ArrowRight size={17} /> : null}</button>
                </form>
              </div>
              <aside className="flow-side"><OrderSummary cinema={selectedCinema} session={selectedSession} seats={seatSelections} plannedTicketTypes={plannedTicketTypes} total={total} plannedTotal={plannedTotal} onRemove={(id) => setSeatSelections((current) => current.filter((seat) => seat.id !== id))} /></aside>
            </div>
          ) : null}

          {screen === "confirmation" && order ? (
            <div className="confirmation-layout"><div className="confirmation-card"><div className="confirmation-icon"><Check size={30} /></div><span className="eyebrow">PAGAMENTO PIX CONFIRMADO</span><h2>Seu lugar está reservado.</h2><p>O pagamento foi confirmado. Enviaremos os dados do pedido para <strong>{order.buyer.email}</strong>.</p><div className="order-code"><span>CÓDIGO DO PEDIDO</span><strong>{order.code}</strong></div><div className="ticket-card"><div className="ticket-main"><span className="ticket-label">AVENGERS: DOOMSDAY</span><h3>{order.cinema.name}</h3><p>{order.cinema.city}, {order.cinema.uf} · {order.session.room}</p><div className="ticket-meta"><span><CalendarDays size={14} /> {order.session.dateLabel}</span><span><Clock3 size={14} /> {order.session.time}</span><span><Film size={14} /> {order.session.format}</span></div><div className="ticket-seats"><span>ASSENTOS</span><strong>{order.seats.map((seat) => `${seat.row}${seat.number}`).join(" · ")}</strong></div></div><div className="ticket-qr"><QRCodeCanvas value={`https://presale.doomsday.example/ticket/${order.code}`} size={132} bgColor="#f4f0e6" fgColor="#10141b" includeMargin /><span>APRESENTE NA ENTRADA</span></div></div>{isEmailErrorPreview ? <div className="demo-validation-hint"><Info size={16} /> QA: falha de envio simulada. O usuário recebe erro e pode tentar novamente.</div> : null}<div className="confirmation-actions"><button className="button button-primary" onClick={() => window.print()}><Download size={17} /> Baixar ingresso</button><button className="button button-secondary" disabled={sendDemoEmail.isPending} onClick={() => { if (isEmailErrorPreview) { toast.error("Não foi possível enviar a confirmação. Tente novamente."); return; } sendDemoEmail.mutate({ orderCode: order.code, email: order.buyer.email }, { onSuccess: (result) => toast.success(`Confirmação enviada para ${result.to} · ${result.messageId}`), onError: (error) => toast.error(error.message) }); }}><Mail size={17} /> {sendDemoEmail.isPending ? "Enviando..." : "Enviar por e-mail"}</button></div><button className="text-button" onClick={resetFlow}>Comprar outro ingresso <ArrowRight size={15} /></button></div><div className="confirmation-side"><div className="side-stat"><span>STATUS</span><strong><span className="pulse-dot" /> PAGAMENTO APROVADO</strong></div><div className="side-stat"><span>FORMA DE PAGAMENTO</span><strong>Pix</strong></div><div className="side-stat"><span>TOTAL</span><strong className="accent-value">{currency(order.total)}</strong></div><div className="scan-card"><ScanLine size={25} /><strong>Uma experiência digna da tela grande.</strong><span>A confirmação depende da notificação segura de pagamento.</span></div></div></div>
          ) : null}
        </section>
      ) : null}

      {screen === "discover" ? <footer className="site-footer container"><div><span className="brand-mark small">A</span><span>AVENGERS: DOOMSDAY / PRÉ-VENDA CONCEITUAL</span></div><span>Dados de cinema: catálogo público de referência. Sessões, disponibilidade e pagamentos aguardam integração oficial.</span></footer> : null}
    </main>
  );
}

function TicketConfigurator({ quantities, session, total, onChange }: { quantities: TicketQuantities; session: Session; total: number; onChange: (ticketType: TicketType, direction: 1 | -1) => void }) {
  const ticketOptions: Array<{ type: TicketType; title: string; description: string; price: number }> = [
    { type: "inteira", title: "Inteira", description: "Ingresso regular", price: session.price },
    { type: "meia", title: "Meia-entrada", description: "Sujeita à comprovação", price: HALF_PRICE },
  ];
  const quantity = quantities.inteira + quantities.meia;
  return <div className="ticket-configurator"><div className="ticket-configurator-heading"><div><span className="panel-index">03</span><h3>Escolha seus ingressos</h3><p>Defina o tipo e a quantidade antes de selecionar os assentos.</p></div><span>{quantity}/{MAX_TICKETS_PER_ORDER}</span></div><div className="ticket-option-list">{ticketOptions.map((option) => <div className="ticket-option" key={option.type}><div><strong>{option.title}</strong><span>{option.description}</span></div><div className="ticket-option-actions"><b>{currency(option.price)}</b><div className="quantity-stepper"><button type="button" onClick={() => onChange(option.type, -1)} disabled={quantities[option.type] === 0} aria-label={`Diminuir quantidade de ${option.title}`}><Minus size={14} /></button><output aria-label={`Quantidade de ${option.title}`}>{quantities[option.type]}</output><button type="button" onClick={() => onChange(option.type, 1)} disabled={quantity === MAX_TICKETS_PER_ORDER} aria-label={`Aumentar quantidade de ${option.title}`}><Plus size={14} /></button></div></div></div>)}</div><div className="ticket-configurator-total"><span>{quantity ? `${quantity} ingresso${quantity > 1 ? "s" : ""} selecionado${quantity > 1 ? "s" : ""}` : "Selecione ao menos um ingresso"}</span><strong>{currency(total)}</strong></div></div>;
}

function OrderSummary({ cinema, session, seats, plannedTicketTypes, total, plannedTotal, onRemove, onContinue }: { cinema: Cinema; session: Session; seats: SeatSelection[]; plannedTicketTypes: TicketType[]; total: number; plannedTotal: number; onRemove: (id: string) => void; onContinue?: () => void }) {
  const isSeatSelectionComplete = plannedTicketTypes.length > 0 && seats.length === plannedTicketTypes.length;
  const displayTotal = isSeatSelectionComplete ? total : plannedTotal;
  return <div className="order-summary"><div className="summary-heading"><div><span className="eyebrow"><ShoppingBag size={14} /> RESUMO DO PEDIDO</span><h2>Seu pedido</h2></div><span className="summary-count">{plannedTicketTypes.length}</span></div><div className="summary-film"><div className="summary-poster"><img src={LOGO_URL} alt="Avengers Doomsday" /></div><div><strong>Avengers: Doomsday</strong><span>{cinema.name}</span><span>{session.dateLabel} · {session.time} · {session.format}</span></div></div><div className="summary-divider" /><div className="summary-location"><MapPin size={15} /><span>{cinema.city}, {cinema.uf}<small>{session.room}</small></span></div><div className="summary-items">{seats.length ? seats.map((seat) => <div className="summary-item" key={seat.id}><div><strong>Assento {seat.row}{seat.number}</strong><span>{seat.ticketType === "meia" ? "Meia-entrada" : "Inteira"}</span></div><div><span>{currency(seat.ticketType === "meia" ? HALF_PRICE : session.price)}</span><button type="button" onClick={() => onRemove(seat.id)} aria-label={`Remover assento ${seat.row}${seat.number}`}><Trash2 size={14} /></button></div></div>) : plannedTicketTypes.length ? plannedTicketTypes.map((ticketType, index) => <div className="summary-item summary-item-pending" key={`${ticketType}-${index}`}><div><strong>{ticketType === "meia" ? "Meia-entrada" : "Inteira"}</strong><span>Aguardando assento</span></div><div><span>{currency(ticketType === "meia" ? HALF_PRICE : session.price)}</span></div></div>) : <div className="summary-empty"><Ticket size={20} /><span>Escolha uma sessão e informe seus ingressos.</span></div>}</div><div className="summary-totals"><span>Ingressos <strong>{currency(displayTotal)}</strong></span><span>Taxa de serviço <strong>{currency(0)}</strong></span><div><span>Total</span><strong>{currency(displayTotal)}</strong></div></div>{onContinue ? <button className="button button-primary wide-button" onClick={onContinue}>Ir para pagamento <ArrowRight size={17} /></button> : null}<p className="summary-safe"><span className="pulse-dot" /> Pagamento PIX protegido</p></div>;
}
