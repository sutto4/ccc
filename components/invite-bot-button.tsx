"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof Button>;

export default function InviteBotButton(props: Props) {
  const clientId =
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
    process.env.NEXT_PUBLIC_CLIENT_ID;

  const href = clientId
    ? `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=268437568&scope=bot%20applications.commands`
    : "#";

  const disabled = !clientId || props.disabled;

  return (
    <Button asChild disabled={disabled} {...props}>
      <Link href={href} target="_blank" rel="noopener noreferrer">
        Invite Bot
      </Link>
    </Button>
  );
}
