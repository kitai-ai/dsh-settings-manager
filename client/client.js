window.__ModuleLoader__.load({ id: "dsh-settings-manager", factory: (require) => {


		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/http.ts
		/**
		* Call one manager API route and parse its JSON body. Throws with the
		* server-provided message when the response is not ok.
		*/
		async function api(path, init) {
			const response = await fetch(path, {
				headers: { "content-type": "application/json" },
				...init
			});
			const text = await response.text();
			let body = {};
			try {
				body = text === "" ? {} : JSON.parse(text);
			} catch {
				body = {};
			}
			if (!response.ok) {
				const message = body.error ?? `HTTP ${response.status}`;
				throw new Error(message);
			}
			return body;
		}
		function listMcpServers() {
			return api("/dsh-settings-manager/mcp");
		}
		function upsertMcpServer(config) {
			return api("/dsh-settings-manager/mcp", {
				method: "POST",
				body: JSON.stringify(config)
			});
		}
		function deleteMcpServer(serverName) {
			return api(`/dsh-settings-manager/mcp/delete?serverName=${encodeURIComponent(serverName)}`, { method: "DELETE" });
		}
		function listSkills() {
			return api("/dsh-settings-manager/skills");
		}
		function getSkillBody(root, name) {
			return api(`/dsh-settings-manager/skills/body?root=${encodeURIComponent(root)}&name=${encodeURIComponent(name)}`);
		}
		function upsertSkill(input) {
			return api("/dsh-settings-manager/skills/upsert", {
				method: "POST",
				body: JSON.stringify(input)
			});
		}
		function deleteSkill(root, name) {
			return api(`/dsh-settings-manager/skills/delete?root=${encodeURIComponent(root)}&name=${encodeURIComponent(name)}`, { method: "DELETE" });
		}
		//#endregion
		//#region src/client/McpSection.tsx
		/** MCP Servers settings section: list, add, edit, and remove MCP servers. */
		const STATUS_COLOR = {
			connected: "#3fb950",
			offline: "#8b949e",
			starting: "#d29922",
			error: "#f85149"
		};
		const s$1 = {
			wrap: {
				display: "flex",
				flexDirection: "column",
				gap: "12px"
			},
			row: {
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "10px 0",
				borderBottom: "1px solid rgba(128,128,128,0.25)"
			},
			name: {
				fontWeight: 600,
				minWidth: "150px"
			},
			target: {
				color: "inherit",
				opacity: .75,
				flex: 1,
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				fontSize: 12
			},
			badge: {
				fontSize: 11,
				padding: "2px 8px",
				borderRadius: "999px",
				border: "1px solid rgba(128,128,128,0.4)"
			},
			chip: {
				display: "flex",
				alignItems: "center",
				gap: "6px",
				fontSize: 12,
				whiteSpace: "nowrap"
			},
			dot: {
				width: 8,
				height: 8,
				borderRadius: "50%"
			},
			hint: {
				fontSize: 12,
				opacity: .7,
				marginTop: -4
			},
			error: {
				color: "#f85149",
				fontSize: 13
			},
			button: {
				padding: "6px 12px",
				borderRadius: 6,
				border: "1px solid rgba(128,128,128,0.4)",
				background: "transparent",
				color: "inherit",
				cursor: "pointer",
				fontSize: 13
			},
			buttonPrimary: {
				background: "rgba(80,140,255,0.18)",
				borderColor: "rgba(80,140,255,0.55)"
			},
			buttonDanger: {
				color: "#f85149",
				borderColor: "rgba(248,81,73,0.5)"
			},
			field: {
				display: "flex",
				flexDirection: "column",
				gap: 4
			},
			label: {
				fontSize: 12,
				opacity: .85
			},
			input: {
				padding: "6px 8px",
				borderRadius: 6,
				border: "1px solid rgba(128,128,128,0.4)",
				background: "transparent",
				color: "inherit",
				font: "inherit",
				fontSize: 13,
				width: "100%",
				boxSizing: "border-box"
			},
			textarea: {
				padding: "6px 8px",
				borderRadius: 6,
				border: "1px solid rgba(128,128,128,0.4)",
				background: "transparent",
				color: "inherit",
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				fontSize: 12,
				width: "100%",
				boxSizing: "border-box",
				minHeight: 64,
				resize: "vertical"
			},
			editor: {
				display: "flex",
				flexDirection: "column",
				gap: 10,
				border: "1px solid rgba(128,128,128,0.3)",
				borderRadius: 8,
				padding: 14,
				background: "rgba(128,128,128,0.06)"
			},
			actions: {
				display: "flex",
				gap: 8,
				justifyContent: "flex-end"
			},
			grid2: {
				display: "grid",
				gridTemplateColumns: "1fr 1fr",
				gap: 10
			},
			empty: {
				fontSize: 13,
				opacity: .7,
				padding: "12px 0"
			}
		};
		function parseLines(text) {
			const out = {};
			for (const line of text.split("\n")) {
				const trimmed = line.trim();
				if (trimmed === "") continue;
				const eq = trimmed.indexOf("=");
				if (eq === -1) continue;
				out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
			}
			return out;
		}
		function McpEditor({ t, initial, onSaved, onCancel }) {
			const [transport, setTransport] = (0, react.useState)(initial?.transport ?? "stdio");
			const [serverName, setServerName] = (0, react.useState)(initial?.serverName ?? "");
			const [command, setCommand] = (0, react.useState)(initial?.command ?? "");
			const [args, setArgs] = (0, react.useState)((initial?.args ?? []).join(" "));
			const [env, setEnv] = (0, react.useState)(Object.entries(initial?.env ?? {}).map(([k, v]) => `${k}=${v}`).join("\n"));
			const [cwd, setCwd] = (0, react.useState)(initial?.cwd ?? "");
			const [url, setUrl] = (0, react.useState)(initial?.url ?? "");
			const [headers, setHeaders] = (0, react.useState)(Object.entries(initial?.headers ?? {}).map(([k, v]) => `${k}=${v}`).join("\n"));
			const [timeoutMs, setTimeoutMs] = (0, react.useState)(String(initial?.toolCallTimeoutMs ?? 6e4));
			const [failOnStartup, setFailOnStartup] = (0, react.useState)(initial?.failOnStartupError ?? false);
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const submit = async () => {
				setSaving(true);
				setError(null);
				const config = {
					serverName: serverName.trim(),
					transport,
					toolCallTimeoutMs: Number(timeoutMs) || 6e4,
					failOnStartupError: failOnStartup
				};
				if (transport === "stdio") {
					config.command = command.trim();
					config.args = args.split(/\s+/).filter(Boolean);
					config.env = parseLines(env);
					config.cwd = cwd.trim();
				} else {
					config.url = url.trim();
					config.headers = parseLines(headers);
				}
				try {
					await upsertMcpServer(config);
					onSaved();
				} catch (e) {
					setError(String(e));
				} finally {
					setSaving(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: s$1.editor,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s$1.grid2,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s$1.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: s$1.label,
								children: t("serverName")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: s$1.input,
								value: serverName,
								onChange: (e) => setServerName(e.target.value),
								placeholder: "github"
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s$1.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: s$1.label,
								children: t("transport")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								style: s$1.input,
								value: transport,
								onChange: (e) => setTransport(e.target.value),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "stdio",
									children: t("stdio")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "streamable-http",
									children: t("streamableHttp")
								})]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s$1.hint,
						children: t("serverNameHint")
					}),
					transport === "stdio" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s$1.grid2,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s$1.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: s$1.label,
									children: t("command")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: s$1.input,
									value: command,
									onChange: (e) => setCommand(e.target.value),
									placeholder: "npx"
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s$1.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: s$1.label,
									children: t("args")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: s$1.input,
									value: args,
									onChange: (e) => setArgs(e.target.value),
									placeholder: "-y @modelcontextprotocol/server-github"
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s$1.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: s$1.label,
								children: t("env")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								style: s$1.textarea,
								value: env,
								onChange: (e) => setEnv(e.target.value),
								placeholder: "GITHUB_TOKEN=ghp_xxx"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s$1.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: s$1.label,
								children: t("cwd")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: s$1.input,
								value: cwd,
								onChange: (e) => setCwd(e.target.value)
							})]
						})
					] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s$1.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							style: s$1.label,
							children: t("url")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							style: s$1.input,
							value: url,
							onChange: (e) => setUrl(e.target.value),
							placeholder: "http://localhost:3000/mcp"
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s$1.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							style: s$1.label,
							children: t("headers")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							style: s$1.textarea,
							value: headers,
							onChange: (e) => setHeaders(e.target.value),
							placeholder: "Authorization=Bearer xxx"
						})]
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s$1.grid2,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: s$1.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								style: s$1.label,
								children: t("timeout")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								style: s$1.input,
								type: "number",
								value: timeoutMs,
								onChange: (e) => setTimeoutMs(e.target.value)
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...s$1.field,
								justifyContent: "flex-end"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 6,
									fontSize: 12
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: failOnStartup,
									onChange: (e) => setFailOnStartup(e.target.checked)
								}), t("failOnStartup")]
							})
						})]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s$1.error,
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s$1.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: s$1.button,
							onClick: onCancel,
							disabled: saving,
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							style: {
								...s$1.button,
								...s$1.buttonPrimary
							},
							onClick: () => void submit(),
							disabled: saving,
							children: saving ? "…" : t("save")
						})]
					})
				]
			});
		}
		function statusLabel(t, status) {
			switch (status) {
				case "connected": return t("connected");
				case "offline": return t("offline");
				case "starting": return t("starting");
				case "error": return t("error");
			}
		}
		function McpSection({ t }) {
			const [servers, setServers] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [editing, setEditing] = (0, react.useState)(null);
			const refresh = (0, react.useCallback)(async () => {
				try {
					const data = await listMcpServers();
					setServers(data.servers);
					setError(null);
				} catch (e) {
					setError(String(e));
				}
			}, []);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			const remove = async (serverName) => {
				if (!window.confirm(t("confirmRemove"))) return;
				try {
					const data = await deleteMcpServer(serverName);
					setServers(data.servers);
				} catch (e) {
					setError(String(e));
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: s$1.wrap,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s$1.hint,
						children: t("mcpSubtitle")
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s$1.error,
						children: error
					}),
					editing !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpEditor, {
						t,
						initial: editing === "new" ? null : editing,
						onSaved: () => {
							setEditing(null);
							refresh();
						},
						onCancel: () => setEditing(null)
					}),
					servers === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s$1.empty,
						children: "…"
					}) : servers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s$1.empty,
						children: t("emptyServers")
					}) : servers.map((server) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s$1.row,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s$1.name,
								children: server.serverName
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s$1.badge,
								children: server.transport
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s$1.target,
								children: server.transport === "stdio" ? `${server.command} ${(server.args ?? []).join(" ")}`.trim() : server.url
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: s$1.chip,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
										...s$1.dot,
										background: STATUS_COLOR[server.status]
									} }),
									statusLabel(t, server.status),
									server.toolCount > 0 ? ` · ${server.toolCount}${t("toolsCount")}` : ""
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								style: s$1.button,
								onClick: () => setEditing(server),
								children: t("edit")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								style: {
									...s$1.button,
									...s$1.buttonDanger
								},
								onClick: () => void remove(server.serverName),
								children: t("delete")
							})
						]
					}, server.serverName)),
					editing === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						style: {
							...s$1.button,
							...s$1.buttonPrimary
						},
						onClick: () => setEditing("new"),
						children: t("addServer")
					}) })
				]
			});
		}
		//#endregion
		//#region src/client/SkillsSection.tsx
		/** Skills settings section: browse, create, edit, and delete local skills. */
		const s = {
			wrap: {
				display: "flex",
				flexDirection: "column",
				gap: "12px"
			},
			rootRow: {
				display: "flex",
				alignItems: "center",
				gap: 8,
				fontSize: 13
			},
			rootSelect: {
				padding: "6px 8px",
				borderRadius: 6,
				border: "1px solid rgba(128,128,128,0.4)",
				background: "transparent",
				color: "inherit",
				font: "inherit",
				fontSize: 13,
				maxWidth: "60%"
			},
			row: {
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "8px 0",
				borderBottom: "1px solid rgba(128,128,128,0.25)"
			},
			name: {
				fontWeight: 600,
				minWidth: "150px"
			},
			desc: {
				color: "inherit",
				opacity: .75,
				flex: 1,
				overflow: "hidden",
				textOverflow: "ellipsis",
				whiteSpace: "nowrap",
				fontSize: 12
			},
			hint: {
				fontSize: 12,
				opacity: .7,
				marginTop: -4
			},
			error: {
				color: "#f85149",
				fontSize: 13
			},
			ok: {
				color: "#3fb950",
				fontSize: 13
			},
			button: {
				padding: "6px 12px",
				borderRadius: 6,
				border: "1px solid rgba(128,128,128,0.4)",
				background: "transparent",
				color: "inherit",
				cursor: "pointer",
				fontSize: 13
			},
			buttonPrimary: {
				background: "rgba(80,140,255,0.18)",
				borderColor: "rgba(80,140,255,0.55)"
			},
			buttonDanger: {
				color: "#f85149",
				borderColor: "rgba(248,81,73,0.5)"
			},
			field: {
				display: "flex",
				flexDirection: "column",
				gap: 4
			},
			label: {
				fontSize: 12,
				opacity: .85
			},
			input: {
				padding: "6px 8px",
				borderRadius: 6,
				border: "1px solid rgba(128,128,128,0.4)",
				background: "transparent",
				color: "inherit",
				font: "inherit",
				fontSize: 13,
				width: "100%",
				boxSizing: "border-box"
			},
			textarea: {
				padding: "6px 8px",
				borderRadius: 6,
				border: "1px solid rgba(128,128,128,0.4)",
				background: "transparent",
				color: "inherit",
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
				fontSize: 12,
				width: "100%",
				boxSizing: "border-box",
				minHeight: 180,
				resize: "vertical"
			},
			badge: {
				fontSize: 11,
				padding: "2px 8px",
				borderRadius: "999px",
				border: "1px solid rgba(128,128,128,0.4)",
				opacity: .8
			},
			editor: {
				display: "flex",
				flexDirection: "column",
				gap: 10,
				border: "1px solid rgba(128,128,128,0.3)",
				borderRadius: 8,
				padding: 14,
				background: "rgba(128,128,128,0.06)"
			},
			actions: {
				display: "flex",
				gap: 8,
				justifyContent: "flex-end"
			},
			empty: {
				fontSize: 13,
				opacity: .7,
				padding: "12px 0"
			}
		};
		function emptyEditor(defaultRoot) {
			return {
				root: defaultRoot,
				name: "",
				description: "",
				whenToUse: "",
				body: "",
				originalName: ""
			};
		}
		function SkillsSection({ t }) {
			const [roots, setRoots] = (0, react.useState)([]);
			const [skills, setSkills] = (0, react.useState)(null);
			const [root, setRoot] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [notice, setNotice] = (0, react.useState)(null);
			const [editor, setEditor] = (0, react.useState)(null);
			const refresh = (0, react.useCallback)(async () => {
				try {
					const data = await listSkills();
					setRoots(data.roots);
					setSkills(data.skills);
					setRoot((current) => current ?? data.roots.find((r) => r.key === "user-dsh")?.path ?? data.roots[0]?.path ?? null);
					setError(null);
				} catch (e) {
					setError(String(e));
				}
			}, []);
			(0, react.useEffect)(() => {
				refresh();
			}, [refresh]);
			const visible = (skills ?? []).filter((skill) => skill.root === root);
			const startCreate = () => {
				setEditor(emptyEditor(root ?? roots[0]?.path ?? ""));
			};
			const startEdit = async (skill) => {
				try {
					const { skill: body } = await getSkillBody(skill.root, skill.name);
					setEditor({
						root: body.root,
						name: body.name,
						description: body.description,
						whenToUse: body.whenToUse ?? "",
						body: body.body,
						originalName: body.name
					});
				} catch (e) {
					setError(String(e));
				}
			};
			const saveEditor = async () => {
				if (editor === null) return;
				setError(null);
				setNotice(null);
				try {
					await upsertSkill({
						root: editor.root,
						name: editor.name.trim(),
						description: editor.description.trim(),
						whenToUse: editor.whenToUse.trim() === "" ? void 0 : editor.whenToUse,
						body: editor.body
					});
					setEditor(null);
					setNotice(t("skillSaved"));
					await refresh();
				} catch (e) {
					setError(String(e));
				}
			};
			const remove = async (skill) => {
				if (!window.confirm(`${t("confirmRemoveSkill")} ${skill.name}？`)) return;
				try {
					await deleteSkill(skill.root, skill.name);
					setNotice(t("skillDeleted"));
					await refresh();
				} catch (e) {
					setError(String(e));
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: s.wrap,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s.hint,
						children: t("skillsSubtitle")
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s.error,
						children: error
					}),
					notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s.ok,
						children: notice
					}),
					editor !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.editor,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: s.label,
									children: t("root")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
									style: s.input,
									value: editor.root,
									onChange: (e) => setEditor({
										...editor,
										root: e.target.value
									}),
									children: roots.map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: r.path,
										children: r.label
									}, r.key))
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: 10
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: s.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: s.label,
										children: t("skillName")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: s.input,
										value: editor.name,
										onChange: (e) => setEditor({
											...editor,
											name: e.target.value
										}),
										placeholder: t("newSkillName")
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: s.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										style: s.label,
										children: t("whenToUse")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										style: s.input,
										value: editor.whenToUse,
										onChange: (e) => setEditor({
											...editor,
											whenToUse: e.target.value
										})
									})]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: s.label,
									children: t("description")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									style: s.input,
									value: editor.description,
									onChange: (e) => setEditor({
										...editor,
										description: e.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.field,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									style: s.label,
									children: t("content")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									style: s.textarea,
									value: editor.body,
									onChange: (e) => setEditor({
										...editor,
										body: e.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: s.actions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									style: s.button,
									onClick: () => setEditor(null),
									children: t("cancel")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									style: {
										...s.button,
										...s.buttonPrimary
									},
									onClick: () => void saveEditor(),
									children: t("save")
								})]
							})
						]
					}),
					roots.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.rootRow,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { opacity: .7 },
							children: t("currentRoot")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							style: s.rootSelect,
							value: root ?? "",
							onChange: (e) => setRoot(e.target.value),
							children: roots.map((r) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: r.path,
								children: r.label
							}, r.key))
						})]
					}),
					skills === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s.empty,
						children: "…"
					}) : visible.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: s.empty,
						children: t("emptySkills")
					}) : visible.map((skill) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: s.row,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s.name,
								children: skill.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s.badge,
								children: skill.kind
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: s.desc,
								children: skill.description
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								style: s.button,
								onClick: () => void startEdit(skill),
								children: t("edit")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								style: {
									...s.button,
									...s.buttonDanger
								},
								onClick: () => void remove(skill),
								children: t("delete")
							})
						]
					}, `${skill.root}/${skill.name}`)),
					editor === null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						style: {
							...s.button,
							...s.buttonPrimary
						},
						onClick: startCreate,
						children: t("createSkill")
					}) })
				]
			});
		}
		const dictionaries = {
			zh: {
				navMcp: "MCP 服务器",
				navSkills: "技能",
				mcpSubtitle: "管理接入的 MCP 服务器，保存后立即生效",
				skillsSubtitle: "管理本机的技能（SKILL.md），保存后自动刷新",
				addServer: "添加服务器",
				editServer: "编辑服务器",
				newServer: "新服务器",
				serverName: "服务器名称 (serverName)",
				serverNameHint: "小写字母/数字/下划线/连字符，1-32 位，工具名会以 mcp__名称__工具名 出现",
				transport: "传输方式",
				stdio: "stdio（本地命令）",
				streamableHttp: "streamable-http（HTTP 端点）",
				command: "命令",
				commandHint: "例如 npx",
				args: "参数（空格分隔）",
				env: "环境变量（每行 KEY=VALUE）",
				cwd: "工作目录（可选）",
				url: "URL",
				headers: "请求头（每行 KEY=VALUE，例如 Authorization: Bearer xxx）",
				timeout: "单次工具调用超时（毫秒）",
				failOnStartup: "启动连接失败时报错（failOnStartupError）",
				save: "保存",
				cancel: "取消",
				delete: "删除",
				edit: "编辑",
				confirmRemove: "确认删除该服务器？工具将立即从对话中移除。",
				confirmRemoveSkill: "确认删除该技能？",
				connected: "已连接",
				offline: "未连接",
				starting: "连接中…",
				error: "错误",
				toolsCount: "个工具",
				emptyServers: "还没有配置 MCP 服务器，点「添加服务器」开始",
				emptySkills: "这个目录下还没有技能",
				loadFail: "加载失败，请重试",
				createSkill: "新建技能",
				editSkill: "编辑技能",
				skillName: "技能名（kebab-case）",
				description: "描述（必填，模型目录靠它路由）",
				whenToUse: "使用时机（可选）",
				content: "正文内容",
				root: "存放目录",
				skillSaved: "已保存，模型目录将自动刷新",
				skillDeleted: "已删除",
				invalidInput: "输入不合法：",
				skillsRoots: "技能根目录",
				currentRoot: "当前目录",
				bodyLoadFail: "正文加载失败",
				newSkillName: "my-skill"
			},
			en: {
				navMcp: "MCP Servers",
				navSkills: "Skills",
				mcpSubtitle: "Manage MCP servers; changes take effect immediately",
				skillsSubtitle: "Manage local skills (SKILL.md); the catalog refreshes automatically",
				addServer: "Add server",
				editServer: "Edit server",
				newServer: "New server",
				serverName: "Server name",
				serverNameHint: "Lowercase letters/digits/_/-, 1-32 chars; tools appear as mcp__name__tool",
				transport: "Transport",
				stdio: "stdio (local command)",
				streamableHttp: "streamable-http (HTTP endpoint)",
				command: "Command",
				commandHint: "e.g. npx",
				args: "Arguments (space separated)",
				env: "Environment (one KEY=VALUE per line)",
				cwd: "Working directory (optional)",
				url: "URL",
				headers: "Headers (one KEY=VALUE per line, e.g. Authorization: Bearer xxx)",
				timeout: "Per tool call timeout (ms)",
				failOnStartup: "Fail on startup connection error",
				save: "Save",
				cancel: "Cancel",
				delete: "Delete",
				edit: "Edit",
				confirmRemove: "Remove this server? Its tools disappear from conversations immediately.",
				confirmRemoveSkill: "Delete this skill?",
				connected: "Connected",
				offline: "Offline",
				starting: "Connecting…",
				error: "Error",
				toolsCount: "tools",
				emptyServers: "No MCP servers yet — click \"Add server\" to start",
				emptySkills: "No skills in this root yet",
				loadFail: "Failed to load, please retry",
				createSkill: "New skill",
				editSkill: "Edit skill",
				skillName: "Skill name (kebab-case)",
				description: "Description (required; the model catalog routes on it)",
				whenToUse: "When to use (optional)",
				content: "Body",
				root: "Root",
				skillSaved: "Saved — the model catalog refreshes automatically",
				skillDeleted: "Deleted",
				invalidInput: "Invalid input: ",
				skillsRoots: "Skill roots",
				currentRoot: "Current root",
				bodyLoadFail: "Failed to load body",
				newSkillName: "my-skill"
			}
		};
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-settings-manager browser half: registers the "MCP 服务器" and "技能"
		* settings sections. The client plugin system serves this bundle at
		* `/plugins/dsh-settings-manager/client.js` because the package declares
		* `dsh.client` (see package.json).
		*
		* @module
		*/
		const name = "dsh-settings-manager";
		/** Services required by this client plugin. */
		const inject = ["slots", "locale"];
		/** Locale namespace for this plugin's copy. */
		const NS = "dsh-settings-manager";
		/**
		* Register the settings sections. Each section renders a React component that
		* talks to the host JSON API over the same-origin HTTP routes.
		* @param ctx - the client context with slots and locale injected.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, dictionaries), "dsh-settings-manager: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "mcp-servers",
				order: 30,
				label: () => t("navMcp"),
				locale: NS
			}, () => (0, react.createElement)(McpSection, { t })));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "skills",
				order: 31,
				label: () => t("navSkills"),
				locale: NS
			}, () => (0, react.createElement)(SkillsSection, { t })));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map