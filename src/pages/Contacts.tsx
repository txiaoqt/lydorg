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

const OFFICE_COORDS: [number, number] = [14.5578, 121.0784];

const officeContact = {
  officeAddress: "Prototype LYDO Office, 2nd Floor, Pasig Youth Services Center, Pasig City, Philippines",
  officerInCharge: "Ms. Carla M. Reyes",
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-16">

        {/* Hero */}
        <section className="hero-gradient py-10 sm:py-12 md:py-20">
          <div className="container mx-auto max-w-4xl px-6 sm:px-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary-foreground/60">
              Contact Directory
            </p>
            <h1 className="mt-3 text-[1.9rem] font-heading font-bold text-secondary-foreground sm:text-4xl md:text-5xl">
              Office and Staff Contacts
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary-foreground/70 sm:text-base">
              Find the LYDO office address, officer in charge, and staff contact details below.
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-12 md:py-16">
          <div className="container mx-auto max-w-4xl px-6 sm:px-8 space-y-8">

            {/* Map — isolate creates a new stacking context, preventing Leaflet's high z-indices from overlapping the fixed navbar */}
            <div className="relative isolate rounded-2xl overflow-hidden border border-border shadow-sm h-72 sm:h-96">
              <MapContainer
                center={OFFICE_COORDS}
                zoom={15}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={OFFICE_COORDS}>
                  <Popup>
                    <strong>LYDO Connect Office</strong><br />
                    {officeContact.officeAddress}
                  </Popup>
                </Marker>
              </MapContainer>
            </div>

            {/* Office card */}
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 card-shadow">
              <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">

                {/* Address block */}
                <div className="flex gap-4">
                  <div className="shrink-0 grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary mt-0.5">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                      LYDO Office
                    </p>
                    <p className="text-base font-medium text-foreground leading-snug">
                      {officeContact.officeAddress}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <UserRound className="h-4 w-4 text-primary shrink-0" />
                      Officer in charge: <span className="text-foreground font-medium">{officeContact.officerInCharge}</span>
                    </div>
                  </div>
                </div>

                {/* Contact chips */}
                <div className="flex flex-row sm:flex-col gap-3 sm:items-end">
                  <a
                    href={`tel:${officeContact.contactNumber}`}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    {officeContact.contactNumber}
                  </a>
                  <a
                    href={`mailto:${officeContact.contactEmail}`}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    <Mail className="h-4 w-4 text-primary shrink-0" />
                    {officeContact.contactEmail}
                  </a>
                </div>
              </div>
            </div>

            {/* Staff cards */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Support Staff
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {staffContacts.map((staff) => (
                  <div
                    key={staff.name}
                    className="rounded-2xl border border-border bg-card p-5 card-shadow"
                  >
                    <p className="font-heading font-semibold text-foreground mb-4">{staff.name}</p>
                    <div className="space-y-2">
                      <a
                        href={`tel:${staff.contactNumber}`}
                        className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                      >
                        <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                        {staff.contactNumber}
                      </a>
                      <a
                        href={`mailto:${staff.contactEmail}`}
                        className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                      >
                        <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                        {staff.contactEmail}
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
