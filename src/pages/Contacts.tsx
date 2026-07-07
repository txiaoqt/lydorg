import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, MapPin, Phone, UserRound } from "lucide-react";

L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const OFFICE_COORDS: [number, number] = [14.592421073182033, 121.08615468030744];

const officeContact = {
  officeAddress: "Eulogio Amang Rodriguez Ave, Pasig, 1609 Metro Manila",
  officerInCharge: "Ms. Colleen Gail A. De Guzman",
  contactNumber: "+63 917 123 4567",
  contactEmail: "lydo.office@prototype.local",
};

const staffContacts = [
  {
    name: "Staff Coordination Desk",
    contactNumber: "+63 918 234 5678",
    contactEmail: "lydo.staff@prototype.local",
  },
  {
    name: "Youth Support",
    contactNumber: "+63 919 345 6789",
    contactEmail: "lydo.support@prototype.local",
  },
];

const Contacts = () => {
  return (
    <div className="contact-directory-page min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">
        <section className="contact-directory-hero hero-gradient py-8 sm:py-10 md:py-20">
          <div className="container mx-auto max-w-4xl px-5 text-center sm:px-8">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary-foreground/60">
              Contact Directory
            </p>
            <h1 className="mt-3 text-[1.85rem] font-heading font-bold leading-tight text-secondary-foreground sm:text-4xl md:text-5xl">
              Office and Staff Contacts
            </h1>
            <p className="mx-auto mt-3 max-w-[30rem] text-[0.9rem] leading-relaxed text-secondary-foreground/70 sm:mt-4 sm:max-w-2xl sm:text-base">
              Find the LYDO office address, officer in charge, and staff contact details below.
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-10 md:py-16">
          <div className="container mx-auto max-w-4xl space-y-6 px-4 sm:px-6 md:space-y-8 md:px-8">
            <div
              className="contact-map-wrapper contact-directory-map relative isolate overflow-hidden rounded-2xl border border-border shadow-sm sm:h-96"
              style={{ height: "240px", minHeight: "240px" }}
            >
              <MapContainer
                center={OFFICE_COORDS}
                zoom={15}
                scrollWheelZoom={false}
                className="contact-map h-full w-full"
                style={{ height: "100%", width: "100%", minHeight: "240px" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={OFFICE_COORDS}>
                  <Popup>
                    <strong>Y-TRACE Office</strong>
                    <br />
                    {officeContact.officeAddress}
                  </Popup>
                </Marker>
              </MapContainer>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 card-shadow sm:p-5 md:p-8">
              <div className="grid gap-4 sm:gap-5 md:grid-cols-[1fr_auto] md:items-start md:gap-6">
                <div className="flex min-w-0 gap-3 sm:gap-4">
                  <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary md:h-11 md:w-11">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      LYDO Office
                    </p>
                    <p className="text-[1rem] font-medium leading-snug text-foreground md:text-base">
                      {officeContact.officeAddress}
                    </p>
                    <div className="mt-3 grid gap-1.5 text-muted-foreground">
                      <span className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Officer in charge
                      </span>
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-2 gap-y-1 text-[0.92rem]">
                        <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="min-w-0 font-medium text-foreground [overflow-wrap:anywhere]">
                          {officeContact.officerInCharge}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 md:min-w-[16rem]">
                  <a
                    href={`tel:${officeContact.contactNumber}`}
                    className="contact-method grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 border-t border-border py-2.5 text-[0.9rem] font-medium text-foreground transition-colors first:border-t-0 hover:text-primary md:rounded-xl md:border md:bg-muted/40 md:px-4 md:py-2.5 md:hover:border-primary/40 md:hover:bg-primary/5"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-primary" />
                    <span className="contact-method-value min-w-0 [overflow-wrap:anywhere]">
                      {officeContact.contactNumber}
                    </span>
                  </a>
                  <a
                    href={`mailto:${officeContact.contactEmail}`}
                    className="contact-method contact-email grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 border-t border-border py-2.5 text-[0.9rem] font-medium text-foreground transition-colors hover:text-primary md:rounded-xl md:border md:bg-muted/40 md:px-4 md:py-2.5 md:hover:border-primary/40 md:hover:bg-primary/5"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                    <span className="contact-method-value min-w-0 [overflow-wrap:anywhere]">
                      {officeContact.contactEmail}
                    </span>
                  </a>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Support Staff
              </p>
              <div className="support-contact-grid grid gap-3 sm:grid-cols-2 md:gap-4">
                {staffContacts.map((staff) => (
                  <div key={staff.name} className="rounded-2xl border border-border bg-card p-4 card-shadow md:p-5">
                    <p className="mb-3 font-heading font-semibold text-foreground">{staff.name}</p>
                    <div>
                      <a
                        href={`tel:${staff.contactNumber}`}
                        className="contact-method grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 border-t border-border py-2.5 text-[0.88rem] text-foreground transition-colors first:border-t-0 hover:text-primary md:rounded-lg md:border md:border-border/70 md:bg-muted/30 md:px-3 md:py-2 md:text-sm md:hover:border-primary/30"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="contact-method-value min-w-0 [overflow-wrap:anywhere]">
                          {staff.contactNumber}
                        </span>
                      </a>
                      <a
                        href={`mailto:${staff.contactEmail}`}
                        className="contact-method contact-email grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2.5 border-t border-border py-2.5 text-[0.88rem] text-foreground transition-colors hover:text-primary md:rounded-lg md:border md:border-border/70 md:bg-muted/30 md:px-3 md:py-2 md:text-sm md:hover:border-primary/30"
                      >
                        <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="contact-method-value min-w-0 [overflow-wrap:anywhere]">
                          {staff.contactEmail}
                        </span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Contacts;
