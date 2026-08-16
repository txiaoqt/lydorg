import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { CircleHelp, Mail, MapPin, Phone, Send } from "lucide-react";
import Navbar from "@/components/Navbar";
import AnnouncementBar from "@/components/AnnouncementBar";
import Footer from "@/components/Footer";

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const COORDS: [number, number] = [14.592421073182033, 121.08615468030744];
const address = "3/F, Temporary Pasig City Hall, Eulogio Amang Rodriguez Ave., Brgy. Rosario, Pasig City";
const phone = "(02) 8643-7632";
const email = "lydo@pasigcity.gov.ph";

const Contacts = () => {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient px-4 pt-[96px] sm:px-6 sm:pt-[120px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 pb-4 pt-4 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">
          <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left sm:gap-[16px]">
            <h1 className="font-segoe font-bold leading-tight tracking-[-0.03em] text-public-text-neutral-on-neutral text-[28px] sm:text-public-fs-hero">
              Contact Us
            </h1>
            <p className="font-segoe font-normal leading-relaxed sm:leading-[120%] text-public-text-neutral-on-neutral text-sm sm:text-public-fs-subtitle-sm max-w-md">
              Get in touch with the PCYDO office in Pasig City.
            </p>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="bg-public-bg-section px-4 pb-10 pt-5 sm:px-6 sm:pb-[64px] sm:pt-[36px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-[936px] flex-col gap-3.5 sm:gap-5">

          {/* Row 1 — Map */}
          <div
            className="isolate h-[180px] overflow-hidden rounded-xl sm:rounded-2xl border border-public-bg-brand-subtle shadow-2xs sm:shadow-xs sm:h-[260px]"
          >
            <MapContainer
              center={COORDS}
              zoom={16}
              scrollWheelZoom={true}
              zoomControl={true}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={COORDS}>
                <Popup>
                  <strong>PCYDO Office</strong>
                  <br />
                  {address}
                </Popup>
              </Marker>
            </MapContainer>
          </div>

          {/* Row 2 — Office Address */}
          <div className="flex items-center gap-3 rounded-xl sm:rounded-2xl border border-public-bg-brand-subtle bg-white p-4 sm:p-5 shadow-2xs sm:shadow-xs sm:gap-4">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-public-bg-tertiary-100 p-2 sm:p-2.5 text-public-text-brand">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-public-text-brand" />
            </div>
            <div className="flex flex-col gap-0.5 sm:gap-1 min-w-0">
              <p className="font-segoe text-xs sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Office Address
              </p>
              <p className="font-segoe text-sm sm:text-base font-bold leading-snug text-[#0E2F66] break-words">
                {address}
              </p>
            </div>
          </div>

          {/* Row 3 — Telephone + Email (left) | Office Hours (right) */}
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-stretch sm:gap-5">

            {/* Left: Telephone + Email stacked */}
            <div className="flex flex-1 flex-col gap-3.5 sm:gap-4">

              {/* Telephone */}
              <div className="flex items-center gap-3 rounded-xl sm:rounded-2xl border border-public-bg-brand-subtle bg-white p-4 sm:p-4.5 sm:px-5 shadow-2xs sm:shadow-xs sm:gap-4">
                <div className="flex h-10 w-10 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-public-bg-tertiary-100 p-2 text-public-text-brand">
                  <Phone className="h-5 w-5 text-public-text-brand" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="font-segoe text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Telephone
                  </p>
                  <p className="font-segoe text-sm sm:text-base font-bold leading-snug text-[#0E2F66]">
                    {phone}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 rounded-xl sm:rounded-2xl border border-public-bg-brand-subtle bg-white p-4 sm:p-4.5 sm:px-5 shadow-2xs sm:shadow-xs sm:gap-4">
                <div className="flex h-10 w-10 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-public-bg-tertiary-100 p-2 text-public-text-brand">
                  <Mail className="h-5 w-5 text-public-text-brand" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="font-segoe text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </p>
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-segoe text-sm sm:text-base font-bold leading-snug text-[#0E2F66] hover:underline break-all"
                  >
                    {email}
                  </a>
                </div>
              </div>

            </div>

            {/* Right: Office Hours */}
            <div className="flex flex-1 flex-col gap-2 sm:gap-2.5 rounded-xl sm:rounded-2xl border border-public-bg-brand-subtle bg-white p-4 sm:p-5 sm:px-6 shadow-2xs sm:shadow-xs justify-center">
              <p className="font-segoe text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                Office Hours
              </p>
              <div className="flex justify-between items-center border-b border-public-border-default/70 pb-2 sm:pb-2.5">
                <span className="font-segoe text-sm font-semibold text-[#0E2F66]">
                  Monday - Friday
                </span>
                <span className="font-segoe text-sm font-bold text-[#0E2F66]">
                  8:00 AM – 5:00 PM
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-public-border-default/70 pb-2 sm:pb-2.5">
                <span className="font-segoe text-sm font-normal text-slate-500">
                  Saturday
                </span>
                <span className="font-segoe text-sm font-medium text-slate-500">
                  Closed
                </span>
              </div>
              <div className="flex justify-between items-center pb-0.5 sm:pb-0">
                <span className="font-segoe text-sm font-normal text-slate-500">
                  Sunday
                </span>
                <span className="font-segoe text-sm font-medium text-slate-500">
                  Closed
                </span>
              </div>
            </div>

          </div>

          {/* Row 4 — Still Need Help? */}
          <div className="flex flex-col items-center gap-2.5 sm:gap-3.5 rounded-xl sm:rounded-2xl border border-public-border-default bg-white p-5 sm:p-8 text-center shadow-2xs sm:shadow-xs mt-1 sm:mt-1">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-public-bg-tertiary-100 text-[#0E2F66]">
              <CircleHelp className="h-5 w-5 sm:h-6 sm:w-6 text-public-text-brand" />
            </div>
            <div className="flex flex-col gap-1 sm:gap-1.5 px-1 max-w-md">
              <h3 className="font-segoe text-base sm:text-lg font-bold text-[#0E2F66]">
                Still Need Help?
              </h3>
              <p className="font-segoe text-xs sm:text-sm text-slate-500 leading-relaxed">
                Can't find the answer you're looking for? Reach out to the PCYDO office directly
                and we'll get back to you as soon as possible.
              </p>
            </div>
            <a
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-public-bg-brand px-5 py-2.5 font-segoe text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-public-bg-brand-hover shadow-xs mt-1"
            >
              <Send className="h-4 w-4 shrink-0" />
              Send an Email
            </a>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contacts;
