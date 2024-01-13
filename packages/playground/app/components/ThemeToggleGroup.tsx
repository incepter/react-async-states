import { useTheme } from "next-themes";

import { ToggleGroup } from "@/components";

import { useIsMounted } from "@/hooks";

import { DesktopIcon, MoonIcon, SunIcon } from "@radix-ui/react-icons";

const themeOptions = [
  {
    value: "system",
    icon: <DesktopIcon />,
  },
  {
    value: "dark",
    icon: <MoonIcon />,
  },
  {
    value: "light",
    icon: <SunIcon />,
  },
];

export default function ThemeToggleGroup() {
  const mounted = useIsMounted();
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return null;
  }

  return (
    <ToggleGroup type="single" className="flex" defaultValue={theme}>
      {themeOptions.map(({ value, icon }) => (
        <ToggleGroup.Item
          key={value}
          className="flex h-8 flex-1 items-center justify-center"
          value={value}
          onClick={() => setTheme(value)}
        >
          {icon}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup>
  );
}
