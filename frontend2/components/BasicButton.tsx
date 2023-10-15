

type BasicButtonProps = {
    text: string;
    onClick: () => any;
};

export default function BasicButton({ text, onClick }: BasicButtonProps) {
    return (
        <div className="flex flex-col justify-center items-center">
            <button onClick={onClick} className="bg-gray-600 rounded-lg p-2 hover:brightness-90 active:brightness-75">{text}</button>
        </div>
    );
}