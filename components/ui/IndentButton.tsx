"use client";

import { Button } from "./button";

export function IndentButton({}) {
    const handleClick = (): void => {
       this.parentElement?.classList.toggle("pl-4");
    };

    return (
            <Button 
                onClick={handleClick}
                className=""
            >
                
                
            </Button>
    )
}