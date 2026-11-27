import {
  CalendarCheckIcon,
  CalendarIcon,
  ChatIcon,
  HomeIcon,
  ListIcon,
  MegaphoneIcon,
  ScissorsIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
} from "../icons";
import type { StaffIcon as IconName } from "./nav";

const ICONS = {
  HomeIcon,
  CalendarIcon,
  CalendarCheckIcon,
  UsersIcon,
  ListIcon,
  ChatIcon,
  MegaphoneIcon,
  ScissorsIcon,
  SettingsIcon,
  UserIcon,
} satisfies Record<IconName, unknown>;

export function StaffIcon({ name, className }: { name: IconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
