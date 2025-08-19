"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof Button> & { children?: React.ReactNode };

export default function InviteBotButton(props: Props) {
  const { children, ...rest } = props;
  const clientId =
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
    process.env.NEXT_PUBLIC_CLIENT_ID;
  const perms = "8";
  const url = clientId
    ? `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${perms}&scope=bot%20applications.commands`
    : "#";
  const disabled = !clientId || rest.disabled;
  
  // When asChild is true, the Button will render as the Link
  // The disabled state is handled through the Button's styling
  return (
    <Button asChild {...rest}>
      <Link href={url} target="_blank" rel="noopener noreferrer">
        {children ?? "Invite Bot"}
      </Link>
    </Button>
  );
}
