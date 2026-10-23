"use client";

import { Button } from "./button";
import { DiamondPlus } from "lucide-react";

export function AddListLine({}) {
    const handleClick = (): void => {
       //open dialogue to add new list item
       console.log("Add new list item");
    };

    return (
            <Button 
                onClick={handleClick}
                className="bg-rose-100/0 hover:bg-rose-400 rounded-full"
            >
                <DiamondPlus color="#a50036" className="opacity-100"/>
                
            </Button>
    )
}