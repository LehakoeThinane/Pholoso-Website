<?php
/* Pholoso Afrika Foundation - simple file-based rate limiting per visitor.
 * The IP address is never stored: each file is named by a salted SHA-256 hash
 * and holds only submission timestamps, which expire after the window. */

final class RateLimiter
{
    private $dir;
    private $salt;
    private $max;
    private $window;

    public function __construct(string $dir, string $salt, int $max, int $windowSeconds)
    {
        $this->dir    = $dir;
        $this->salt   = $salt;
        $this->max    = $max;
        $this->window = $windowSeconds;
    }

    /** Records an attempt. Returns false if the visitor is over the limit. */
    public function allow(string $ip): bool
    {
        if (!is_dir($this->dir) && !@mkdir($this->dir, 0700, true)) {
            // Storage unavailable: fail open rather than block real visitors.
            error_log('pholoso contact: rate-limit storage unavailable');
            return true;
        }
        $file = $this->dir . '/' . hash('sha256', $this->salt . '|' . $ip) . '.json';
        $now  = time();
        $fh   = @fopen($file, 'c+');
        if ($fh === false) {
            return true;
        }
        flock($fh, LOCK_EX);
        $hits = json_decode((string) stream_get_contents($fh), true);
        $hits = is_array($hits) ? $hits : [];
        $cut  = $now - $this->window;
        $hits = array_values(array_filter($hits, function ($t) use ($cut) {
            return is_int($t) && $t > $cut;
        }));
        $ok = count($hits) < $this->max;
        if ($ok) {
            $hits[] = $now;
        }
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($hits));
        flock($fh, LOCK_UN);
        fclose($fh);

        if (mt_rand(1, 50) === 1) {
            $this->sweep($cut);
        }
        return $ok;
    }

    /** Deletes files untouched for a whole window, so old hashes do not pile up. */
    private function sweep(int $cut): void
    {
        foreach ((array) glob($this->dir . '/*.json') as $f) {
            if (is_string($f) && @filemtime($f) < $cut) {
                @unlink($f);
            }
        }
    }
}
