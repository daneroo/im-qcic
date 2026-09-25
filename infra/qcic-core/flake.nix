# qcic-syno: a qcic-core host - the smallest NixOS machine that runs
# ./compose.yaml. Exploratory origin: #298; tracking in ./ROLLOUT.md.
#
# One machine today; a second qcic-core host would be another entry in
# nixosConfigurations sharing `common`.
#
# The machine was installed with nixos-anywhere (btrfs, #298 install 1), then
# moved to ext4 on a second disk from inside the running guest (install 2):
# guest btrfs on the Synology's btrfs tripled fsync cost. The btrfs layout
# lives in git history.
#
# Apply from the machine itself:
#   sudo nixos-rebuild switch --flake 'github:daneroo/im-qcic/<branch>?dir=infra/qcic-core#qcic-syno'
{
  description = "qcic-core hosts: Docker + Tailscale for the QCIC v2 stack";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    disko = {
      url = "github:nix-community/disko";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { nixpkgs, disko, ... }:
    let
      # GPT with both a BIOS-boot and an ESP partition, so the same disk boots
      # under SeaBIOS (VMM today) or OVMF (VMM UEFI, Proxmox). Mounts are by
      # partlabel (`disk-<name>-<partition>`); the disk name `ext4` keeps them
      # distinct from the retired btrfs layout's `disk-main-*`.
      gptDisk = device: root: {
        type = "disk";
        inherit device;
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
              content = root;
            };
          };
        };
      };

      # ext4, not btrfs: the LUN already sits on the Synology's btrfs, and
      # guest btrfs on top cost ~3x per fsync (ROLLOUT.md, disk finding).
      # By id, not /dev/sdX: attaching a disk renamed them once already, and
      # GRUB's install target has to survive that.
      ext4Disk = {
        disko.devices.disk.ext4 = gptDisk "/dev/disk/by-id/scsi-36001405b15d7a6ed5715d4107da118d9" {
          type = "filesystem";
          format = "ext4";
          mountpoint = "/";
          mountOptions = [ "noatime" ];
        };
      };

      common =
        {
          config,
          modulesPath,
          pkgs,
          ...
        }:
        {
          # Synology VMM presents a plain QEMU i440FX guest: virtio-net,
          # virtio-scsi, virtio console. This profile covers it, so there is
          # no generated hardware-configuration.nix.
          imports = [ (modulesPath + "/profiles/qemu-guest.nix") ];

          # disko fills grub.devices from the EF02 partition. Removable EFI
          # install writes no NVRAM entry, so it works from a BIOS boot too.
          boot.loader.grub = {
            enable = true;
            efiSupport = true;
            efiInstallAsRemovable = true;
          };
          # VMM's UEFI VMs present a VMware SVGA II adapter. Without this,
          # vmwgfx takes the display over from the firmware framebuffer
          # mid-boot and VMM's console freezes before the login prompt.
          boot.kernelParams = [ "nomodeset" ];

          # Ubuntu on gateway2 uses GRUB_TIMEOUT=0; 1s keeps the generation
          # menu reachable at a known cost to the QEMU -> kernel stage.
          boot.loader.timeout = 1;

          # Per-host values for compose (see compose.yaml's header), derived
          # from the hostname so they cannot drift. HOSTALIAS is for
          # containers only; HOST_NAME is Caddy's host-scoped site label.
          environment.etc."qcic-core/host.env".text = ''
            HOSTALIAS=${config.networking.hostName}
            HOST_NAME=${config.networking.hostName}
          '';
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
            btop
            git
            jq
            just
          ];

          system.stateVersion = "26.05";
        };

      host =
        hostName: disk:
        nixpkgs.lib.nixosSystem {
          system = "x86_64-linux";
          modules = [
            disko.nixosModules.disko
            common
            disk
            { networking.hostName = hostName; }
          ];
        };
    in
    {
      nixosConfigurations.qcic-syno = host "qcic-syno" ext4Disk;
    };
}
