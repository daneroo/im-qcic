# gateway-nix: the smallest NixOS host that runs infra/gateway2/compose.yaml
# unchanged. Exploratory (#298); tracking in ./ROLLOUT.md.
#
# Install (from gauss, see ROLLOUT.md):
#   nix run github:nix-community/nixos-anywhere -- \
#     --flake 'github:daneroo/im-qcic/agent/gateway-nix?dir=infra/gateway-nix#gateway-nix' \
#     --target-host daniel@<ip>
{
  description = "gateway-nix: Docker + Tailscale host for the gateway2 stack";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { nixpkgs, disko, ... }:
    {
      nixosConfigurations.gateway-nix = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          disko.nixosModules.disko
          (
            { modulesPath, pkgs, ... }:
            {
              # Synology VMM presents a plain QEMU i440FX guest: virtio-net,
              # virtio-scsi, virtio console. This profile covers it, so there
              # is no generated hardware-configuration.nix.
              imports = [ (modulesPath + "/profiles/qemu-guest.nix") ];

              # GPT with both a BIOS-boot and an ESP partition, so the same
              # disk boots under SeaBIOS (VMM today) or OVMF (VMM UEFI,
              # Proxmox). Mounts are by partlabel; only `device` is VM-specific.
              disko.devices.disk.main = {
                type = "disk";
                device = "/dev/sda";
                content = {
                  type = "gpt";
                  partitions = {
                    bios = {
                      size = "1M";
                      type = "EF02";
                      priority = 1;
                    };
                    ESP = {
                      size = "512M";
                      type = "EF00";
                      content = {
                        type = "filesystem";
                        format = "vfat";
                        mountpoint = "/boot";
                        mountOptions = [ "umask=0077" ];
                      };
                    };
                    root = {
                      size = "100%";
                      content = {
                        type = "btrfs";
                        extraArgs = [ "-f" ];
                        subvolumes =
                          let
                            opts = [
                              "compress=zstd"
                              "noatime"
                            ];
                          in
                          {
                            "@" = {
                              mountpoint = "/";
                              mountOptions = opts;
                            };
                            "@nix" = {
                              mountpoint = "/nix";
                              mountOptions = opts;
                            };
                            # Keeps image/container churn out of root snapshots.
                            "@docker" = {
                              mountpoint = "/var/lib/docker";
                              mountOptions = opts;
                            };
                          };
                      };
                    };
                  };
                };
              };

              # disko fills grub.devices from the EF02 partition. Removable EFI
              # install writes no NVRAM entry, so it works from a BIOS boot too.
              boot.loader.grub = {
                enable = true;
                efiSupport = true;
                efiInstallAsRemovable = true;
              };
              # Ubuntu on gateway2 uses GRUB_TIMEOUT=0; 1s keeps the generation
              # menu reachable at a known cost to the QEMU -> kernel stage.
              boot.loader.timeout = 1;

              networking.hostName = "gateway-nix";
              time.timeZone = "UTC";

              services.qemuGuest.enable = true;
              services.tailscale = {
                enable = true;
                # Lets daniel run `tailscale` without sudo.
                extraSetFlags = [ "--operator=daniel" ];
              };
              services.openssh = {
                enable = true;
                settings = {
                  KbdInteractiveAuthentication = false;
                  PasswordAuthentication = false;
                  PermitRootLogin = "no";
                };
              };

              # Published ports (80/443/4222/8000/...) are DNAT'd by Docker and
              # never reach the NixOS INPUT chain, so no firewall openings here.
              virtualisation.docker.enable = true;

              users.users.daniel = {
                isNormalUser = true;
                extraGroups = [
                  "wheel"
                  "docker"
                ];
                # From nix-garden (legacy/nix-garden/host/minimal).
                hashedPassword = "$6$K9VVOhEK7yygNC1T$PIirqGGbEqN6T4foCBTabahTNZfR.PDGqJUpzfAsHUxKs3vcSrv4my55.7nhgo6EQXeSgL025IjUQS.0AkIL80";
                openssh.authorizedKeys.keys = [
                  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBrUdJY3Aj0Xi2zdlGrEHFv3FNnlMz6ASLclhhl9cj1p daniel@galois"
                ];
              };
              # Temporary, for the experiment. Remove before calling it done.
              security.sudo.wheelNeedsPassword = false;

              nix.settings = {
                experimental-features = [
                  "nix-command"
                  "flakes"
                ];
                # Lets `nixos-rebuild --target-host daniel@...` copy closures.
                trusted-users = [ "daniel" ];
              };

              environment.systemPackages = with pkgs; [
                git
                just
              ];

              system.stateVersion = "26.05";
            }
          )
        ];
      };
    };
}
