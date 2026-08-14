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
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-2 py-4 text-center sm:items-start sm:text-left sm:gap-[16px] sm:py-[48px] sm:min-h-[285px]">
          <h1 className="font-segoe font-bold leading-tight tracking-[-0.03em] text-public-text-neutral-on-neutral text-[26px] sm:text-public-fs-hero">
            Contact Us
          </h1>
          <p className="font-segoe font-normal leading-relaxed sm:leading-[120%] text-public-text-neutral-on-neutral text-xs sm:text-public-fs-subtitle-sm max-w-md">
            Get in touch with the PCYDO office in Pasig City.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="bg-public-bg-section px-4 pb-10 pt-5 sm:px-6 sm:pb-[48px] sm:pt-[64px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-[936px] flex-col gap-3.5 sm:gap-[24px]">

          {/* Row 1 — Map */}
          <div
            className="isolate h-[180px] overflow-hidden rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle shadow-2xs sm:shadow-public-nav sm:h-[282px]"
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
          <div className="flex items-center gap-3 rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle bg-white p-4 sm:p-[24px] shadow-2xs sm:shadow-public-nav sm:gap-[24px]">
            <div className="flex h-10 w-10 sm:h-[48px] sm:w-[48px] shrink-0 items-center justify-center rounded-lg sm:rounded-[16px] bg-public-bg-tertiary-100 p-2 sm:p-[8px]">
              <MapPin className="h-5 w-5 sm:h-8 sm:w-8 text-public-text-brand" />
            </div>
            <div className="flex flex-col gap-1 sm:gap-[6px] min-w-0">
              <p className="font-segoe text-[11px] sm:text-public-fs-body-sm font-normal leading-tight text-public-text-neutral-default">
                Office Address
              </p>
              <p className="font-segoe text-xs sm:text-public-fs-subheading-sm font-semibold leading-snug text-public-text-brand break-words">
                {address}
              </p>
            </div>
          </div>

          {/* Row 3 — Telephone + Email (left) | Office Hours (right) */}
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-stretch sm:gap-[24px]">

            {/* Left: Telephone + Email stacked */}
            <div className="flex flex-1 flex-col gap-3.5 sm:gap-[24px]">

              {/* Telephone */}
              <div className="flex items-center gap-3 rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle bg-white p-4 sm:p-[24px] shadow-2xs sm:shadow-public-nav sm:gap-[24px]">
                <div className="flex h-10 w-10 sm:h-[48px] sm:w-[48px] shrink-0 items-center justify-center rounded-lg sm:rounded-[16px] bg-public-bg-tertiary-100 p-2 sm:p-[8px]">
                  <Phone className="h-5 w-5 sm:h-8 sm:w-8 text-public-text-brand" />
                </div>
                <div className="flex flex-col gap-1 sm:gap-[6px]">
                  <p className="font-segoe text-[11px] sm:text-public-fs-body-sm font-normal leading-tight text-public-text-neutral-default">
                    Telephone
                  </p>
                  <p className="font-segoe text-xs sm:text-public-fs-subheading-sm font-semibold leading-snug text-public-text-brand">
                    {phone}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle bg-white p-4 sm:p-[24px] shadow-2xs sm:shadow-public-nav sm:gap-[24px]">
                <div className="flex h-10 w-10 sm:h-[48px] sm:w-[48px] shrink-0 items-center justify-center rounded-lg sm:rounded-[16px] bg-public-bg-tertiary-100 p-2 sm:p-[8px]">
                  <Mail className="h-5 w-5 sm:h-8 sm:w-8 text-public-text-brand" />
                </div>
                <div className="flex flex-col gap-1 sm:gap-[6px]">
                  <p className="font-segoe text-[11px] sm:text-public-fs-body-sm font-normal leading-tight text-public-text-neutral-default">
                    Email
                  </p>
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-segoe text-xs sm:text-public-fs-subheading-sm font-semibold leading-snug text-public-text-brand hover:underline break-all"
                  >
                    {email}
                  </a>
                </div>
              </div>

            </div>

            {/* Right: Office Hours */}
            <div className="flex flex-1 flex-col gap-2.5 sm:gap-[16px] rounded-xl sm:rounded-[16px] border border-public-bg-brand-subtle bg-white p-4 sm:p-[24px] shadow-2xs sm:shadow-public-nav justify-center">
              <p className="font-segoe text-[11px] sm:text-public-fs-body-sm font-normal leading-tight text-public-text-neutral-default">
                Office Hours
              </p>
              <div className="flex justify-between items-center border-b border-public-border-default/70 pb-2 sm:pb-[12px]">
                <span className="font-segoe text-xs sm:text-public-fs-subheading-sm font-semibold text-public-text-brand">
                  Monday - Friday
                </span>
                <span className="font-segoe text-xs sm:text-public-fs-subheading-sm font-semibold text-public-text-brand">
                  8:00 AM – 5:00 PM
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-public-border-default/70 pb-2 sm:pb-[12px]">
                <span className="font-segoe text-xs sm:text-public-fs-subheading-sm font-normal text-public-text-secondary">
                  Saturday
                </span>
                <span className="font-segoe text-xs sm:text-public-fs-subheading-sm font-normal text-public-text-secondary">
                  Closed
                </span>
              </div>
              <div className="flex justify-between items-center pb-0.5 sm:pb-0">
                <span className="font-segoe text-xs sm:text-public-fs-subheading-sm font-normal text-public-text-secondary">
                  Sunday
                </span>
                <span className="font-segoe text-xs sm:text-public-fs-subheading-sm font-normal text-public-text-secondary">
                  Closed
                </span>
              </div>
            </div>

          </div>

          {/* Row 4 — Still Need Help? */}
          <div className="flex flex-col items-center gap-2.5 sm:gap-[16px] rounded-xl sm:rounded-[16px] border border-public-border-default bg-white p-5 sm:px-[24px] sm:py-[60px] text-center shadow-2xs sm:shadow-public-nav mt-1 sm:mt-0">
            <div className="flex h-9 w-9 sm:h-[48px] sm:w-[48px] items-center justify-center rounded-full bg-public-bg-tertiary-100 p-1.5 sm:p-[8px]">
              <CircleHelp className="h-5 w-5 sm:h-8 sm:w-8 text-public-text-brand" />
            </div>
            <div className="flex flex-col gap-1 sm:gap-[10px] px-1 sm:px-[10px]">
              <h3 className="font-segoe text-sm sm:text-public-fs-subtitle-sm font-bold sm:font-semibold leading-tight sm:leading-[120%] tracking-[-0.02em] text-public-text-brand">
                Still Need Help?
              </h3>
              <p className="font-segoe text-xs sm:text-public-fs-body-sm font-normal leading-relaxed sm:leading-[120%] text-public-text-secondary max-w-md">
                Can't find the answer you're looking for? Reach out to the PCYDO office directly
                and we'll get back to you as soon as possible.
              </p>
            </div>
            <a
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 sm:gap-[8px] rounded-lg sm:rounded-[8px] bg-public-bg-brand px-4 py-2 sm:px-[20px] sm:py-[12px] font-segoe text-xs sm:text-public-fs-subheading-sm font-semibold sm:font-normal leading-none text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover shadow-2xs mt-1 sm:mt-0"
            >
              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
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
