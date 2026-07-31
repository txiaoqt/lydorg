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
      <section className="public-templates-hero-gradient px-5 pt-[120px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex min-h-[285px] w-full max-w-7xl flex-col items-center justify-center gap-[16px] py-[48px] text-center sm:items-start sm:text-left">
          <h1 className="font-segoe font-bold leading-[100%] tracking-[-0.03em] text-public-text-neutral-on-neutral text-[32px] sm:text-public-fs-hero">
            Contact Us
          </h1>
          <p className="font-segoe font-normal leading-[120%] text-public-text-neutral-on-neutral text-public-fs-subtitle-sm">
            Get in touch with the PCYDO office<br className="sm:hidden" /> in Pasig City.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="bg-public-bg-section px-5 pb-[48px] pt-[64px] sm:px-6 lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-[936px] flex-col gap-[24px]">

          {/* Row 1 — Map */}
          <div
            className="isolate h-[200px] overflow-hidden rounded-[16px] border border-public-bg-brand-subtle shadow-public-nav sm:h-[282px]"
          >
            <MapContainer
              center={COORDS}
              zoom={16}
              scrollWheelZoom={false}
              zoomControl={false}
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
          <div className="flex flex-col items-start gap-[12px] rounded-[16px] border border-public-bg-brand-subtle bg-white p-[24px] shadow-public-nav sm:flex-row sm:items-center sm:gap-[24px]">
            <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[16px] bg-public-bg-tertiary-100 p-[8px]">
              <MapPin className="h-8 w-8 text-public-text-brand" />
            </div>
            <div className="flex flex-col gap-[6px]">
              <p className="font-segoe text-public-fs-body-sm font-normal leading-[140%] text-public-text-neutral-default">
                Office Address
              </p>
              <p className="font-segoe text-public-fs-subheading-sm font-semibold leading-[120%] text-public-text-brand">
                {address}
              </p>
            </div>
          </div>

          {/* Row 3 — Telephone + Email (left) | Office Hours (right) */}
          <div className="flex flex-col gap-[24px] sm:flex-row sm:items-stretch">

            {/* Left: Telephone + Email stacked */}
            <div className="flex flex-1 flex-col gap-[24px]">

              {/* Telephone */}
              <div className="flex flex-col items-start gap-[12px] rounded-[16px] border border-public-bg-brand-subtle bg-white p-[24px] shadow-public-nav sm:flex-row sm:items-center sm:gap-[24px]">
                <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[16px] bg-public-bg-tertiary-100 p-[8px]">
                  <Phone className="h-8 w-8 text-public-text-brand" />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <p className="font-segoe text-public-fs-body-sm font-normal leading-[140%] text-public-text-neutral-default">
                    Telephone
                  </p>
                  <p className="font-segoe text-public-fs-subheading-sm font-semibold leading-[120%] text-public-text-brand">
                    {phone}
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col items-start gap-[12px] rounded-[16px] border border-public-bg-brand-subtle bg-white p-[24px] shadow-public-nav sm:flex-row sm:items-center sm:gap-[24px]">
                <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[16px] bg-public-bg-tertiary-100 p-[8px]">
                  <Mail className="h-8 w-8 text-public-text-brand" />
                </div>
                <div className="flex flex-col gap-[6px]">
                  <p className="font-segoe text-public-fs-body-sm font-normal leading-[140%] text-public-text-neutral-default">
                    Email
                  </p>
                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-segoe text-public-fs-subheading-sm font-semibold leading-[120%] text-public-text-brand hover:underline"
                  >
                    {email}
                  </a>
                </div>
              </div>

            </div>

            {/* Right: Office Hours */}
            <div className="flex flex-1 flex-col gap-[16px] rounded-[16px] border border-public-bg-brand-subtle bg-white p-[24px] shadow-public-nav">
              <p className="font-segoe text-public-fs-body-sm font-normal leading-[120%] text-public-text-neutral-default">
                Office Hours
              </p>
              <div className="flex justify-between border-b border-public-border-default pb-[12px]">
                <span className="font-segoe text-public-fs-subheading-sm font-semibold leading-[100%] text-public-text-brand">
                  Monday - Friday
                </span>
                <span className="font-segoe text-public-fs-subheading-sm font-semibold leading-[100%] text-public-text-brand">
                  7:00 AM – 4:00 PM
                </span>
              </div>
              <div className="flex justify-between border-b border-public-border-default pb-[12px]">
                <span className="font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-secondary">
                  Saturday
                </span>
                <span className="font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-secondary">
                  Closed
                </span>
              </div>
              <div className="flex justify-between border-b border-public-border-default pb-[12px]">
                <span className="font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-secondary">
                  Sunday
                </span>
                <span className="font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-secondary">
                  Closed
                </span>
              </div>
            </div>

          </div>

          {/* Row 4 — Still Need Help? */}
          <div className="flex flex-col items-center gap-[16px] rounded-[16px] border border-public-border-default bg-white px-[24px] py-[60px] text-center shadow-public-nav">
            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-public-bg-tertiary-100 p-[8px]">
              <CircleHelp className="h-8 w-8 text-public-text-brand" />
            </div>
            <div className="flex flex-col gap-[10px] px-[10px]">
              <h3 className="font-segoe text-public-fs-subtitle-sm font-semibold leading-[120%] tracking-[-0.02em] text-public-text-brand">
                Still Need Help?
              </h3>
              <p className="font-segoe text-public-fs-body-sm font-normal leading-[120%] text-public-text-secondary">
                Can't find the answer you're looking for? Reach out to the PCYDO office directly
                and we'll get back to you as soon as possible.
              </p>
            </div>
            <a
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-[8px] rounded-[8px] bg-public-bg-brand px-[20px] py-[12px] font-segoe text-public-fs-subheading-sm font-normal leading-[100%] text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover"
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
