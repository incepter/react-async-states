import { useTheme } from "next-themes";

import { useEffect, useState } from "react";

import { ToggleGroup } from "@/components";

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
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

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
