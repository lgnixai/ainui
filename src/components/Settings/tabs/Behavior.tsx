import { Button, Group, Kbd, Stack, Switch, Text } from "@mantine/core";
import { adapter } from "~/adapter";
import { useStable } from "~/hooks/stable";
import { store } from "~/store";
import { SurrealistConfig } from "~/types";
import { Setting } from "../setting";
import { setTableSuggest, setErrorChecking, setUpdateChecker, setWindowPinned } from "~/stores/config";
import { Spacer } from "~/components/Spacer";
import { useIsLight } from "~/hooks/theme";
import { runUpdateChecker } from "~/util/updater";

const VERSION = import.meta.env.VERSION;
const AUTHOR = import.meta.env.AUTHOR;

export interface GeneralTabProps {
	config: SurrealistConfig;
	onClose: () => void;
}

export function GeneralTab({ config, onClose }: GeneralTabProps) {
	const isLight = useIsLight();
	
	const checkForUpdates = useStable(() => {
		runUpdateChecker(config.lastPromptedVersion, true);
		onClose();
	});

	const updateTableSuggest = useStable((e: React.ChangeEvent<HTMLInputElement>) => {
		store.dispatch(setTableSuggest(e.target.checked));
	});

	const updateErrorChecking = useStable((e: React.ChangeEvent<HTMLInputElement>) => {
		store.dispatch(setErrorChecking(e.target.checked));
	});

	const updateUpdateChecker = useStable((e: React.ChangeEvent<HTMLInputElement>) => {
		store.dispatch(setUpdateChecker(e.target.checked));
	});

	const togglePinned = useStable((e: React.ChangeEvent<HTMLInputElement>) => {
		store.dispatch(setWindowPinned(e.target.checked));
	});

	return (
		<Stack spacing="xs">
			{adapter.isUpdateCheckSupported && (
				<Setting label="Check for updates">
					<Switch checked={config.updateChecker} onChange={updateUpdateChecker} />
				</Setting>
			)}

			<Setting label="Suggest table names">
				<Switch checked={config.tableSuggest} onChange={updateTableSuggest} />
			</Setting>

			<Setting label="Query error checking">
				<Switch checked={config.errorChecking} onChange={updateErrorChecking} />
			</Setting>
			

			{adapter.isPinningSupported && (
				<Setting label={<>Window always on top <Kbd size="xs">F11</Kbd></>}>
					<Switch checked={config.isPinned} onChange={togglePinned} />
				</Setting>
			)}

			<Group mt="xl" position="center">
				<Text color={isLight ? "light.4" : "dark.3"}>
					Version {VERSION} by {AUTHOR}
				</Text>
				<Spacer />
				<Button variant="subtle" onClick={checkForUpdates}>
					Check for updates
				</Button>
			</Group>
		</Stack>
	);
}
