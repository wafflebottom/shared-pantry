"use client";
import { Circle, CircleCheck } from "lucide-react";
import { Button } from "./button";

type Props = {
    bis_checked?: boolean,
}

const handleClick = (/*bIsClicked: boolean*/)=>{
        //bIsClicked = !bIsClicked;
        console.log("Checkbox clicked. New state: " /*+ bIsClicked*/);
    };

export default function CheckboxButton({ bis_checked = false }: Props) {

    return (
        <Button
            variant="ghost"
            size="icon"
            className=""
            asChild
            onClick={() => handleClick(/*bIsChecked*/)}
        >
            {bis_checked ? 
                <div>
                    <CircleCheck color="#4d0218" className="opacity-50"/> 
                    <p className="text-rose-900 opacity-50 line-through">
                        List Item 1
                    </p> 
                </div>
                : 
                <div>
                    <Circle color="#a50036" className="opacity-100"/>
                    <p className="text-rose-900 ">
                        List Item 1
                    </p> 
                </div>
            }
            
        </Button>
    )
}