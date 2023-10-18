import * as React from "react";

export function TestSpan({
	id,
	children,
}: {
	id: string;
	children: React.ReactNode;
}) {
	return <span data-testid={id}>{children}</span>;
}

export function TestButton({
	id,
	onClick,
	children,
}: {
	id: string;
	children: React.ReactNode;
	onClick: React.ComponentProps<"button">["onClick"];
}) {
	return (
		<button onClick={onClick} data-testid={id}>
			{children}
		</button>
	);
}
