import { useState } from "react"

type DropdownProps = {
    title: string;
    options: string[];
    onChange: (s: string) => any;
}

export default function Dropdown({title, options, onChange}: DropdownProps) {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [selected, setSelected] = useState<string>("");
    if (isOpen) {
        return (
            <div className="flex flex-col justify-center items-center">
                {options.map((option: string, i: number) => (
                    selected === option ?
                    <button key={i} onClick={() => {
                        setSelected(option);
                    }} className="bg-yellow-600 rounded-lg p-2">{option}</button>
                    :
                    <button 
                        key={i} 
                        onClick={() => {setSelected(option); onChange(option)} } 
                        className="bg-gray-600 rounded-lg p-2"
                    >
                        {option}
                    </button>
                ))}
            </div>
        )
    } else {
        return (
            <div className="flex flex-col justify-center items-center">
                <button onClick={() => setIsOpen(true)} className="bg-gray-600 rounded-lg p-2">{title}</button>
            </div>
        )
    }
}