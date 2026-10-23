import RequestNewListTile from "../Client/RequestNewListTile";
import RequestNewListLine from "../Client/RequestNewListLine";
import DeleteButton from "../Client/DeleteButton";

type Props = {
    bis_list_page?: boolean,
}

export default function Footer({ bis_list_page = false, }: Props) {
    return (
        <footer className="fixed bottom-0 left-0 h-24 w-full bg-linear-to-t from-rose-400">
            <div className="flex h-full items-center justify-center gap-6 text-[#a50036] [&_svg]:h-6 [&_svg]:w-6">
                {bis_list_page ? (
                    <>
                        <RequestNewListLine />
                        <DeleteButton />
                    </>
                ) : (
                    <RequestNewListTile />
                )}
            </div>
        </footer>
    )
}
