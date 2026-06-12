import {OrganizationList} from "@clerk/nextjs";

export default function OrgSelectionPage() {
    return(
        <div className="flex min-h-screen items-center justify-center bg-background">
            <OrganizationList
            hidePersonal={true}
            afterCreateOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
            appearance={{
                elements: {
                    rootbox: "mx-auto",
                    card: "shadow-lg",
                },
            }}
            />
        </div>
    );
}