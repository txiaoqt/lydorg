import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, MapPin, Phone, UserRound, Users } from "lucide-react";

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
        <section className="hero-gradient py-10 sm:py-12 md:py-20">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-secondary-foreground/60">
              Contact Directory
            </p>
            <h1 className="mt-3 text-[1.9rem] font-heading font-bold text-secondary-foreground sm:text-4xl md:text-5xl">
              Office and Staff Contacts
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary-foreground/70 sm:text-base md:text-lg">
              Use this page for the office address, officer in charge, and staff contact details. The footer now stays clean and only links here.
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-12 md:py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Office Address</p>
                    <h2 className="text-xl font-semibold text-foreground">LYDO Office</h2>
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Office address</p>
                    <p className="mt-1 text-base text-foreground">{officeContact.officeAddress}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Officer in charge</p>
                    <p className="mt-1 flex items-center gap-2 text-base text-foreground">
                      <UserRound className="h-4 w-4 text-primary" />
                      {officeContact.officerInCharge}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                      <p className="text-sm font-medium text-muted-foreground">Contact number</p>
                      <a href={`tel:${officeContact.contactNumber}`} className="mt-2 flex items-center gap-2 text-foreground transition-colors hover:text-primary">
                        <Phone className="h-4 w-4" />
                        {officeContact.contactNumber}
                      </a>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                      <p className="text-sm font-medium text-muted-foreground">Contact email</p>
                      <a href={`mailto:${officeContact.contactEmail}`} className="mt-2 flex items-center gap-2 text-foreground transition-colors hover:text-primary">
                        <Mail className="h-4 w-4" />
                        {officeContact.contactEmail}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Staff</p>
                    <h2 className="text-xl font-semibold text-foreground">Support Contacts</h2>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {staffContacts.map((staff) => (
                    <div key={staff.name} className="rounded-xl border border-border/80 bg-muted/20 p-4">
                      <p className="font-medium text-foreground">{staff.name}</p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Contact number</p>
                          <a href={`tel:${staff.contactNumber}`} className="text-foreground transition-colors hover:text-primary">
                            {staff.contactNumber}
                          </a>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Contact email</p>
                          <a href={`mailto:${staff.contactEmail}`} className="text-foreground transition-colors hover:text-primary">
                            {staff.contactEmail}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
