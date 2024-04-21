import { ActionIcon, Box, Button, Center, Group, Kbd, LoadingOverlay, Modal, Paper, Popover, Stack, Text, Title, useMantineTheme } from "@mantine/core";
import { mdiAdjust, mdiCog, mdiDownload, mdiHelpCircle, mdiImageOutline, mdiPlus, mdiXml } from "@mdi/js";
import { ElementRef, useEffect, useRef, useState } from "react";
import { Icon } from "~/components/Icon";
import { Panel } from "~/components/Panel";
import { DesignerLayoutMode, DesignerNodeMode, TableDefinition } from "~/types";
import { ReactFlow, useEdgesState, useNodesState, useReactFlow } from "reactflow";
import { NODE_TYPES, buildTableGraph as buildTableDiagram, createSnapshot } from "./helpers";
import { useStable } from "~/hooks/stable";
import { useIsLight } from "~/hooks/theme";
import { useIsConnected } from "~/hooks/connection";
import { TableCreator } from "~/components/TableCreator";
import { ModalTitle } from "~/components/ModalTitle";
import { useActiveSession } from "~/hooks/environment";
import { store } from "~/store";
import { DESIGNER_LAYOUT_MODES, DESIGNER_NODE_MODES } from "~/constants";
import { useDesignerConfig } from "./hooks";
import { TableGrid } from "./grid";
import { RadioSelect } from "~/components/RadioSelect";
import { useToggleList } from "~/hooks/toggle";
import { updateSession } from "~/stores/config";
import { adapter } from "~/adapter";
import { showNotification } from "@mantine/notifications";
import { sleep } from "radash";

interface HelpTitleProps {
	isLight: boolean;
	children: React.ReactNode;
}

function HelpTitle({ isLight, children }: HelpTitleProps) {
	return (
		<Title order={2} size={14} color={isLight ? "light.7" : "light.1"} weight={600}>
			{children}
		</Title>
	);
}

export interface TableGraphPaneProps {
	active: TableDefinition | null;
	tables: TableDefinition[];
	setActiveTable: (table: string) => void;
}

export function TableGraphPane(props: TableGraphPaneProps) {
	const theme = useMantineTheme();
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [expanded, toggleExpanded] = useToggleList();
	const [isRendering, setIsRendering] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [showConfig, setShowConfig] = useState(false);
	const [showExporter, setShowExporter] = useState(false);
	const [showHelp, setShowHelp] = useState(false);
	const ref = useRef<ElementRef<"div">>(null);
	const isOnline = useIsConnected();
	const activeSession = useActiveSession();
	const isLight = useIsLight();
	
	const { nodeMode, layoutMode } = useDesignerConfig(activeSession);
	const { fitView, getViewport, setViewport } = useReactFlow();

	useEffect(() => {
		const [nodes, edges] = buildTableDiagram(
			props.tables,
			props.active,
			nodeMode,
			expanded,
			(table) => toggleExpanded(table)
		);

		setNodes(nodes);
		setEdges(edges);
	}, [props.tables, props.active, nodeMode, expanded]);

	const saveImage = useStable(async (type: 'png' | 'svg') => {
		const viewport = getViewport();

		const isSuccess = await adapter.saveFile("Save snapshot", `snapshot.${type}`, [
			{
				name: "Image",
				extensions: [type],
			},
		], async () => {
			setIsRendering(true);

			await sleep(50);

			fitView();
			
			return await createSnapshot(ref.current!, type);
		});

		setIsRendering(false);
		setViewport(viewport);
		
		if (isSuccess) {
			showNotification({
				message: "Snapshot saved to disk"
			});
		}
	});

	const openHelp = useStable(() => {
		setShowHelp(true);
	});

	const closeHelp = useStable(() => {
		setShowHelp(false);
	});

	const showBox = !isOnline || props.tables.length === 0;

	const openCreator = useStable(() => {
		setIsCreating(true);
	});

	const closeCreator = useStable(() => {
		setIsCreating(false);
	});

	const toggleConfig = useStable(() => {
		setShowConfig(v => !v);
	});

	const toggleExporter = useStable(() => {
		setShowExporter(v => !v);
	});

	const setNodeMode = useStable((mode: string) => {
		store.dispatch(updateSession({
			id: activeSession?.id,
			designerNodeMode: mode as DesignerNodeMode,
		}));
	});

	const setLayoutMode = useStable((mode: string) => {
		store.dispatch(updateSession({
			id: activeSession?.id,
			designerLayoutMode: mode as DesignerLayoutMode,
		}));
	});

	return (
		<Panel
			title="Table Graph"
			icon={mdiAdjust}
			style={{ overflow: 'hidden' }}
			rightSection={
				<Group noWrap>
					<ActionIcon title="Create table..." onClick={openCreator}>
						<Icon color="light.4" path={mdiPlus} />
					</ActionIcon>
					{layoutMode == "diagram" && (
						<Popover
							opened={showExporter}
							onChange={setShowExporter}
							position="bottom-end"
							offset={{ crossAxis: -4, mainAxis: 8 }}
							withArrow
							withinPortal
							shadow={`0 8px 25px rgba(0, 0, 0, ${isLight ? 0.2 : 0.75})`}
						>
							<Popover.Target>
								<ActionIcon
									title="Export Graph"
									onClick={toggleExporter}
								>
									<Icon color="light.4" path={mdiDownload} />
								</ActionIcon>
							</Popover.Target>
							<Popover.Dropdown onMouseLeave={toggleExporter} p="xs">
								<Stack pb={4}>
									<Button
										color="surreal"
										variant="subtle"
										fullWidth
										size="xs"
										onClick={() => saveImage('svg')}
									>
										Save as SVG
										<Icon
											right
											path={mdiXml}
										/>
									</Button>
									<Button
										color="surreal"
										variant="subtle"
										fullWidth
										size="xs"
										onClick={() => saveImage('png')}
									>
										Save as PNG
										<Icon
											right
											path={mdiImageOutline}
										/>
									</Button>
								</Stack>
							</Popover.Dropdown>
						</Popover>
					)}
					<Popover
						opened={showConfig}
						onChange={setShowConfig}
						position="bottom-end"
						offset={{ crossAxis: -4, mainAxis: 8 }}
						withArrow
						withinPortal
						shadow={`0 8px 25px rgba(0, 0, 0, ${isLight ? 0.2 : 0.75})`}
					>
						<Popover.Target>
							<ActionIcon
								title="Graph Options"
								onClick={toggleConfig}
							>
								<Icon color="light.4" path={mdiCog} />
							</ActionIcon>
						</Popover.Target>
						<Popover.Dropdown onMouseLeave={toggleConfig}>
							<Stack pb={4}>
								<ModalTitle>
									Table graph options
								</ModalTitle>
								<RadioSelect
									label="Table layout"
									data={DESIGNER_LAYOUT_MODES}
									value={layoutMode}
									onChange={setLayoutMode}
								/>

								<RadioSelect
									label="Table appearance"
									data={DESIGNER_NODE_MODES}
									value={nodeMode}
									onChange={setNodeMode}
								/>
							</Stack>
						</Popover.Dropdown>
					</Popover>
					<ActionIcon title="Help" onClick={openHelp}>
						<Icon color="light.4" path={mdiHelpCircle} />
					</ActionIcon>
				</Group>
			}>
			<div style={{ width: "100%", height: "100%" }}>
				{showBox && (
					<Center h="100%" pos="absolute" inset={0} style={{ zIndex: 1 }}>
						<Paper py="md" px="xl" c="light.5" bg={isLight ? "light.0" : "dark.8"} ta="center" maw={400}>
							{isOnline ? (
								<>
									No tables found
									<Box mt={4} c="surreal" style={{ cursor: "pointer" }} onClick={openCreator}>
										Click here to create a new table
									</Box>
								</>
							) : (
								"Not connected to database"
							)}
						</Paper>
					</Center>
				)}

				<LoadingOverlay
					visible={isRendering}
					overlayOpacity={1}
					overlayColor={isLight ? theme.white : theme.colors.dark[7]}
					loaderProps={{ size: 50 }}
				/>
				
				{layoutMode == 'diagram' ? (
					<ReactFlow
						ref={ref}
						nodeTypes={NODE_TYPES}
						nodes={nodes}
						edges={edges}
						nodesDraggable={false}
						nodesConnectable={false}
						edgesFocusable={false}
						proOptions={{ hideAttribution: true }}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onNodeClick={(_ev, node) => {
							props.setActiveTable(node.id);
						}}
					/>
				) : (
					<TableGrid
						ref={ref}
						tables={props.tables}
						active={props.active}
						nodeMode={nodeMode}
						expanded={expanded}
						onExpand={toggleExpanded}
						onSelectTable={(table) => {
							props.setActiveTable(table.schema.name);
						}}
					/>
				)}
			</div>

			<Modal
				opened={showHelp}
				onClose={closeHelp}
				trapFocus={false}
				size="lg"
				title={<ModalTitle>Using the Table Graph</ModalTitle>}
			>
				<Text color={isLight ? "light.7" : "light.3"}>
					<HelpTitle isLight={isLight}>How do I use the table graph?</HelpTitle>

					<Text mt={8} mb="xl">
						The table graph will automatically render based on the tables in your database. You can click on a table to
						view its details and modify it's schema. Changes made to the schema will be reflected in the graph.
					</Text>

					<HelpTitle isLight={isLight}>Can I change how tables are displayed?</HelpTitle>

					<Text mt={8} mb="xl">
						Press the <Icon path={mdiCog} size="sm" /> button in the top right corner to open the graph options. Inside you
						can change the table layout and table appearance. These settings are saved per session, however you can configure
						default values in the Surrealist settings.
					</Text>

					<HelpTitle isLight={isLight}>Why are edges missing?</HelpTitle>

					<Text mt={8} mb="xl">
						Surrealist dermines edges by searching for correctly configured <Kbd>in</Kbd> and <Kbd>out</Kbd> fields. You
						can automatically create a new edge table by pressing the <Icon path={mdiPlus} /> button on the Table Graph
						panel. Keep in mind edges are only visible when the layout is set to Diagram.
					</Text>

					<HelpTitle isLight={isLight}>Can I save the graph as an image?</HelpTitle>

					<Text mt={8}>
						Press the save snapshot button in the options dropdown to save the current graph as a PNG
						image. This snapshot will use your current theme, position, and scale.
					</Text>
				</Text>
			</Modal>

			<TableCreator
				opened={isCreating}
				onClose={closeCreator}
			/>
		</Panel>
	);
}
