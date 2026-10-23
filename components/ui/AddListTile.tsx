"use client";

import { Button } from "./button";
import { ListPlus } from "lucide-react";

export function AddListTile({}) {
    const handleClick = (): void => {
       //open dialogue to add new list tile
       console.log("Add new list tile");
    };

    return (
            <Button 
                onClick={handleClick}
                className="bg-rose-100/0 hover:bg-rose-400 rounded-full"
            >
                <ListPlus color="#a50036" className="opacity-100"/>
                
            </Button>
    )
}