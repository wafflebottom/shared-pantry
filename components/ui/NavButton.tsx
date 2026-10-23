import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";

type Props = {
    icon: LucideIcon,
    label: string,
    href?: string,
    className?: string
}

export function NavButton({
    icon: Icon,
    label,
    href = "/",
    className = "",
}: Props) {
    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={label}
            title={label}
            className={`rounded-full ${className}`}
            asChild
        >
            <Link href={href}>
                <Icon color="#a50036" className="opacity-100"/>
            </Link>
        </Button>
    )
}