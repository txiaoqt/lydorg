import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapPin, Mail, MessageSquare, Send, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePublicContactInfo } from "@/lib/admin-system-settings";

// Fix Leaflet default marker icon in bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Temporary Pasig City Hall coordinates (Brgy. Rosario, Pasig City)
const COORDS: [number, number] = [14.59238, 121.08618];

const Contacts = () => {
  const { address, email, officeName } = usePublicContactInfo();
  const gmailComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="public-templates-hero-gradient public-hero-pasig-photo px-4 sm:px-6 lg:px-[64px]">
        <div className="public-page-hero-body mx-auto flex w-full max-w-7xl flex-col justify-center gap-6 pb-6 pt-6 sm:gap-[48px] sm:pb-[48px] sm:pt-[64px]">
          <div className="flex flex-col items-center gap-2.5 text-center sm:items-start sm:text-left">
            <h1 className="font-tnr font-normal leading-[1.1] tracking-[-0.01em] text-public-text-neutral-on-neutral text-[28px] sm:text-public-fs-hero">
              Contact Us
            </h1>
            <p className="font-inter text-base font-normal leading-[1.6] text-white/85">
              For inquiries regarding services provided by the Pasig City Youth Development Office (PCYDO), please use the official contact information provided below.
            </p>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="bg-white px-4 pb-10 pt-8 sm:px-6 sm:pb-[64px] sm:pt-[48px] lg:px-[64px]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 sm:gap-12">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">

            {/* Left — Contact details */}
            <div className="flex flex-col gap-6 font-inter">
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-public-text-brand">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Office Address
                </p>
                <p className="text-sm sm:text-base leading-relaxed text-public-text-neutral-default break-words">
                  {address}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-public-text-brand">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  Official Email
                </p>
                <a
                  href={gmailComposeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-fit text-sm sm:text-base font-semibold text-public-text-brand hover:underline break-all"
                >
                  {email}
                </a>
                <p className="text-xs sm:text-sm leading-relaxed text-public-text-secondary">
                  For official correspondence, document-related inquiries, and assistance with youth organization-related matters, please contact the PCYDO through the official email address provided above.
                </p>
              </div>

              <div className="flex flex-col gap-3 bg-public-bg-section p-4 sm:p-5">
                <p className="flex items-center gap-2 text-sm sm:text-base font-semibold text-public-text-brand">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  Office Hours
                </p>
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">Day</th>
                      <th scope="col">Operating Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1 text-public-text-neutral-default">Monday–Thursday</td>
                      <td className="py-1 text-right font-semibold text-public-text-brand">7:00 AM–6:00 PM</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-public-text-secondary">Friday–Sunday</td>
                      <td className="py-1 text-right text-public-text-secondary">Closed</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right — Map */}
            <div className="isolate h-[260px] overflow-hidden border border-public-border-default sm:h-[340px] lg:h-full lg:min-h-[400px]">
            <MapContainer
              center={COORDS}
              zoom={16}
              minZoom={13}
              // Pasig City with a small margin; panning stops at the edge.
              maxBounds={[[14.52, 121.03], [14.63, 121.13]]}
              maxBoundsViscosity={1}
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
                  <strong>{officeName}</strong>
                  <br />
                  {address}
                </Popup>
              </Marker>
            </MapContainer>
            </div>
          </div>

          {/* Need Assistance */}
          <div className="flex flex-col gap-4 border-l-4 border-public-border-brand bg-public-bg-section p-5 font-inter sm:flex-row sm:items-center sm:gap-6 sm:p-6">
            <MessageSquare className="h-7 w-7 shrink-0 text-public-text-brand" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 className="text-base sm:text-lg font-semibold text-public-text-brand">Need Assistance?</h2>
              <p className="text-xs sm:text-sm leading-relaxed text-public-text-secondary">
                For further inquiries, please contact the PCYDO through its official email address. Include the purpose of your inquiry and any relevant details to help the office address your request.
              </p>
            </div>
            <a
              href={gmailComposeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit shrink-0 items-center gap-2 rounded-[2px] bg-public-bg-brand px-5 py-2.5 text-xs sm:text-sm font-semibold text-public-text-on-brand transition-colors hover:bg-public-bg-brand-hover"
            >
              <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
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
