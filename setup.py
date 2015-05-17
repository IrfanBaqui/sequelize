
def get_git_revision_hash():
    import subprocess
    return subprocess.check_output(['git', 'rev-parse', 'HEAD'])


with open('docs/api/instance.md', 'r') as f:
    s = f.read()

    s = s.replace('{{HASH}}', get_git_revision_hash())

with open('docs/api/instance.md', 'w+') as f:
    f.write(s)
