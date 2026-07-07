import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.25rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "surface-hover": "hsl(var(--surface-hover))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          active: "hsl(var(--primary-active))",
          strong: "hsl(var(--primary-strong))",
          soft: "hsl(var(--primary-soft))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        brand: {
          deepBlue: "hsl(var(--brand-deep-blue))",
          midBlue: "hsl(var(--brand-mid-blue))",
          skGold: "hsl(var(--brand-sk-gold))",
          skRed: "hsl(var(--brand-sk-red))",
        },
        user: {
          pageBg: "hsl(var(--user-page-bg))",
          surface: "hsl(var(--user-surface))",
          border: "hsl(var(--user-border))",
          navDark: "hsl(var(--user-nav-dark))",
          heading: "hsl(var(--user-heading))",
          link: "hsl(var(--user-link))",
          body: "hsl(var(--user-body))",
          meta: "hsl(var(--user-meta))",
          onDark: "hsl(var(--user-on-dark))",
          activeOnDark: "hsl(var(--user-active-on-dark))",
        },
        admin: {
          pageBg: "hsl(var(--admin-page-bg))",
          surface: "hsl(var(--admin-surface))",
          border: "hsl(var(--admin-border))",
          navDark: "hsl(var(--admin-nav-dark))",
          heading: "hsl(var(--admin-heading))",
          link: "hsl(var(--admin-link))",
          body: "hsl(var(--admin-body))",
          meta: "hsl(var(--admin-meta))",
          onDark: "hsl(var(--admin-on-dark))",
          activeOnDark: "hsl(var(--admin-active-on-dark))",
        },
        semantic: {
          success: "hsl(var(--semantic-success))",
          warning: "hsl(var(--semantic-warning))",
          danger: "hsl(var(--semantic-danger))",
          infoAdmin: "hsl(var(--semantic-info-admin))",
          infoUser: "hsl(var(--semantic-info-user))",
          disabled: "hsl(var(--semantic-disabled))",
          placeholder: "hsl(var(--semantic-placeholder))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
