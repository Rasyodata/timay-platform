import {
  Boxes,
  Briefcase,
  Building2,
  Car,
  ClipboardList,
  Cpu,
  Database,
  Factory,
  FileText,
  HardDrive,
  Laptop,
  Package,
  Table2,
  Truck,
  Users,
  Wrench,
  CalendarClock,
  Gavel,
  Scale,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Dinamik modüller için seçilebilir ikon seti.
export const ICON_MAP: Record<string, LucideIcon> = {
  Boxes,
  Car,
  Package,
  Wrench,
  Database,
  Table2,
  FileText,
  Laptop,
  Factory,
  Truck,
  Building2,
  Users,
  Briefcase,
  ClipboardList,
  Cpu,
  HardDrive,
  CalendarClock,
  Gavel,
  Scale,
  ShieldCheck,
};

export const ICON_CHOICES = Object.keys(ICON_MAP);

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Boxes;
}
