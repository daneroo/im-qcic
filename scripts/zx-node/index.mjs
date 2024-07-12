import 'zx/globals';

// Decisions we have made:
//  gum is required - not options as in bash version
// We need to refactor, perhaps an interface around headers/blocks/ spinners
// perhaps a dependency of parts ( ts status - ts peers -> [] ts ping)
await main();
async function main() {
  try {
    await requiredCommands(["gum", "nats", "nats-top"]);
    await gumFormat("# QCIC - Host report", false);
    await showIdentity();
    await showTailscale();
    await showNats();
    await showHTTPServices();
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}
async function showIdentity() {
  const hostnameFQDN = await OK($`hostname -f`);
  const hostnameShort = await OK($`hostname -s`);
  const uname = await OK($`uname`);

  const activeInterface = await (uname == "Darwin"
    ? OK($`route get default | grep interface | awk '{print $2}'`)
    : OK($`ip route | grep default | awk '{print $5}'`));
  const myIP = await (uname == "Darwin"
    ? OK($`ipconfig getifaddr ${activeInterface}`)
    : OK(
        $`ip -4 addr show ${activeInterface} | grep -oP '(?<=inet\\s)\\d+(\\.\\d+){3}'`
      ));
  await gumFormat(`
## Identity (${hostnameShort})
- Hostname: ${hostnameFQDN}
- IP Address: ${myIP}
  `);
}

async function showTailscale() {
  // TODO: this throws if not found!!!
  const tailscaleCmd = await findTailscaleCommand();
  const statusText = await OK($`${tailscaleCmd} status --peers=false`);

  if (statusText === "Tailscale is stopped.") {
    await gumFormat(`
## Tailscale Identity
- Tailscale is stopped.
`);
    return;
  }

  // local myTailscaleIPV4=$($tailscaleCmd ip --4)
  // local tailscaleHostname=$($tailscaleCmd whois $myTailscaleIPV4 | grep -m 1 "Name:" | awk '{print $2}')
  const myTailscaleIPV4 = await OK($`${tailscaleCmd} ip --4`);
  const whoisText = await OK($`${tailscaleCmd} whois ${myTailscaleIPV4}`);
  // now get the first line that contains "Name:"
  const tailscaleHostname = whoisText
    .split("\n")
    .find((line) => line.includes("Name:"))
    .split(":")[1]
    .trim();
  // console.log({ whoisText, tailscaleHostname });
  await gumFormat(`
## Tailscale Identity
- Tailscale IP: ${myTailscaleIPV4}
- Tailscale Hostname: ${tailscaleHostname}

## Tailscale Status (Peers)

`);
  const statusJSON = JSON.parse(await OK($`${tailscaleCmd} status --json`));
  // local peers=$(echo "${statusJSON}" | jq -r '.Peer[] | "\(.HostName)\t\(.Online)\t\(.Active)\t\(.TailscaleIPs[0])"')
  // Peer is map { "nodekey:f4251e702b..": { peer data }, ...a}
  const peers = Object.values(statusJSON.Peer);
  const peerRows = [
    "| Host                 | IP Address      | Online |",
    "| -------------------- | --------------- | ------ |",
  ];
  for (const peer of peers) {
    // HostName is bad for ipad-4 -> localhost could use DNSName,
    // but that looks like: ipad-4.tail62209.ts.net. (trailing tailnet and dot)
    const { HostName, Online, /*Active,*/ TailscaleIPs } = peer;
    const ip = TailscaleIPs[0];
    const line = `| ${HostName} | ${ip} | ${Online} |`;
    peerRows.push(line);
  }
  const peerTable = "\n### All peers\n\n" + peerRows.join("\n") + "\n";
  console.log("");
  await gumFormat(peerTable);

  // now ping active hosts
  const activePeers = peers.filter((peer) => peer.Online === true);
  const activePeerRows = [
    "| Host                 | IP Address      | Online | Via                  | Delay   |",
    "| -------------------- | --------------- | ------ | -------------------- | ------- |",
  ];
  for (const peer of activePeers) {
    const { HostName, TailscaleIPs, Online } = peer;
    const ip = TailscaleIPs[0];
    const pongResult = await OK(
      spinner(
        `Tailscale pinging ${HostName}...`,
        () =>
          $`${tailscaleCmd} ping -c 1 --timeout 5s --until-direct=false ${ip}`
      )
    );
    if (pongResult.includes("timed out")) {
      continue;
    }
    // pong from shannon (100.100.25.28) via DERP(tor) in 24ms
    // pong from synk (100.85.169.81) via 74.12.24.130:41641 in 5ms
    // # Extract the "via" and "delay" values using awk
    // via=$(echo "$ping_output" | awk -F ' via | in ' '{print $2}')
    // delay=$(echo "$ping_output" | awk -F ' in ' '{print $2}')
    const via = pongResult.split(" via ")[1].split(" in ")[0];
    const delay = pongResult.split(" in ")[1];

    // console.log({ HostName, ip, Online, via, delay });
    const line = `| ${HostName} | ${ip} | ${Online} | ${via} | ${delay} |`;
    activePeerRows.push(line);

    // ping_output=$(run_with_spinner "$tailscaleCmd ping -c 1 --timeout 5s --until-direct=false $ip" "Tailscale Pinging $host...")
  }
  const activePeerTable =
    "\n### Active peers\n\n" + activePeerRows.join("\n") + "\n";
  console.log("");
  await gumFormat(activePeerTable);
}

async function showNats() {
  const natsServer = "nats.ts.imetrical.com";
  const natsSubject = "im.>";
  gumFormat(`
## NATS  Section
 - connecting to ${natsServer}
`);

  const natsSubOutput = await OK(
    spinner(
      `Connecting to Nats (sub)...`,
      () =>
        $`nats -s ${natsServer} sub --timeout=10s --count 1 ${natsSubject} 2>/dev/null`
    )
  );
  console.log("");
  await gumFormat(`
### NATS subscription (${natsSubject})
\`\`\`
${natsSubOutput}
\`\`\`
`);

  const natsTopOutput = await OK(
    spinner(
      `Connecting to Nats (top)...`,
      () => $`nats-top -s ${natsServer} -o -`
    )
  );
  console.log("");
  await gumFormat(`
### NATS Top
\`\`\`
${natsTopOutput}
\`\`\`
`);
}

async function showHTTPServices() {
  console.log("");
  gumFormat("## HTTP Services");

  const scrobble_peers = ["dirac", "darwin", "d1-px1"];
  const services = [
    "https://status.dl.imetrical.com/",
    "https://status.dl.imetrical.com/api/logcheck",
    // scrobble peers
    ...scrobble_peers.map(
      (peer) => `http://${peer}.imetrical.com:8000/api/status`
    ),
    "https://status.dl.imetrical.com/api/not-exist",
    "https://not-exist.status.dl.imetrical.com/api/not-exist",
  ];
  const greenCheck = chalk.green("✔");
  const redXMark = chalk.red("✗");

  const resultLines = [];
  for (const service of services) {
    const line = await spinner(`Checking ${service}`, async () => {
      try {
        const response = await fetch(service);
        const status = response.status;
        if (status >= 200 && status <= 299) {
          return `${greenCheck} ${service} is up. (${status})`;
        } else {
          return `${redXMark} ${service} is down. (${status})`;
        }
      } catch (error) {
        return `${redXMark} ${service} is down. (${error.message})`;
      }
    });
    resultLines.push(line);
  }
  console.log("");
  gumFormat(resultLines.join("\n"));
}

// return the path to tailscale if it is available, otherwise throw an error
async function findTailscaleCommand() {
  const available = !!(await which("tailscale", { nothrow: true }));
  if (available) {
    return "tailscale";
  }
  const otherPaths = [
    "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
    "/volume1/@appstore/Tailscale/bin/tailscale",
  ];
  for (const path of otherPaths) {
    try {
      const available = (await $`test -x ${path}`).exitCode === 0;
      if (available) {
        return path;
      }
    } catch (error) {
      // ignore
    }
  }
  throw new Error("Tailscale command is not available");
}
async function requiredCommands(commands) {
  const unavailableCommands = [];
  for (const command of commands) {
    const available = !!(await which(command, { nothrow: true }));
    if (!available) {
      unavailableCommands.push(command);
    }
  }
  if (unavailableCommands.length > 0) {
    throw new Error(
      `Some required commands are not available: ${unavailableCommands.join(
        ", "
      )}`
    );
  }
}
// Utilities below
async function gumFormat(str, trim = true) {
  // GUM THEME pink (default), light, notty, dracula
  const gumTheme = "pink";
  const p = $`gum format --theme ${gumTheme}`;
  p.stdin.write(str);
  p.stdin.end();
  console.log(await OK(p, trim));
}

// return stdout if exit code is 0, otherwise throw an error
async function OK(processPromise, trim = true) {
  const processOutput = await processPromise;
  const { exitCode, stdout } = processOutput;
  if (exitCode === 0) {
    return trim ? stdout.trim() : stdout;
  }
  throw new Error(`Process failed with code ${processOutput.exitCode}`);
}
