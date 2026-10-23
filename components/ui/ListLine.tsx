import { Checkbox } from "@/components/ui/checkbox";

import { Circle, CircleCheck } from "lucide-react"
import CheckboxButton from "./CheckboxButton"


type Props = {
    indent?: string,
}

export default function ListLine({ indent = "0" }: Props) {
    
    return (
        <div className={indent ==="0" ? "ml-0 flex items-center" : indent === "1" ? "ml-3 flex items-center" : indent === "2" ? "ml-6 flex items-center" : indent === "3" ? "ml-9 flex items-center" : indent === "4" ? "ml-12 flex items-center" : indent === "5" ? "ml-15 flex items-center" : indent === "6" ? "ml-18 flex items-center" : indent === "7" ? "ml-21 flex items-center" : indent === "8" ? "ml-24 flex items-center" : ""}>
            
            <Checkbox />
            {
            <p className="text-rose-900 ">
                List Item 1
            </p> 
            }
        </div>
    )
}

//<CheckboxButton />